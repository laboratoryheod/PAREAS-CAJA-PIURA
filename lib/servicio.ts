// Lógica de negocio del módulo. TODOS los montos y fechas se calculan aquí (servidor); el cliente nunca los inventa.
import { createHash } from "node:crypto";
import QRCode from "qrcode";
import { getRepo as repoBase, type CampanaRow, type ClienteRow, type CreditoRow, type CuotaRow, type EventoRow, type PagoPlan, type PropuestaRow, type Repo } from "./db/repo";
import { diferenciaDias, fechaLarga, soles, sumarDias, sumarMeses } from "./fecha";
import { CATEGORIAS_BASE, COLORES_ETIQUETA, DatoInvalido, FRECUENCIAS, ICONOS_ETIQUETA, ingresoEnMes, resumenMensual, validarFecha, validarMonto, validarNombre, type Categoria, type CuotaCredito, type IconoCategoria } from "./finanzas";
import { consejosFinanzas } from "./consejos-finanzas";
import { calcularRegaloSalvador, interesMoratorio, limitesPara, REGALO_SALVADOR, validarPropuesta, type CreditoReglas, type PropuestaPlan } from "./reglas";
import { APELATIVO } from "./config";
import { nivelDe } from "./niveles";
import { beneficiosDeNivel, chicotazoDelDia, estadoPareas, PARAMS_SCORE, puntosParaSiguienteNivel, rachaPermitida, recalcularScore, triviaPermitida, type Movimiento } from "./score";

/**
 * Repositorio "al día": antes de cada operación se procesan los días que pasaron desde la última visita
 * (mora, interés, planes vencidos y CHICOTAZO), porque la fecha del sistema es la fecha real de Perú.
 */
function getRepo(): Repo {
  const repo = repoBase();
  sincronizarDias(repo);
  return repo;
}

const MAX_DIAS_POR_PROCESAR = 120;

/** Devuelve cuántos CHICOTAZOS se dieron al procesar los días pendientes. */
function sincronizarDias(repo: Repo): number {
  const hoy = repo.fechaHoy();
  let ultima = repo.fechaProcesada();
  if (!ultima) { repo.setFechaProcesada(hoy); return 0; }
  if (ultima >= hoy) return 0;
  let golpes = 0;
  // Si la app estuvo apagada muchísimo tiempo, se procesa como máximo un tramo razonable
  if (diferenciaDias(ultima, hoy) > MAX_DIAS_POR_PROCESAR) ultima = sumarDias(hoy, -MAX_DIAS_POR_PROCESAR);
  while (ultima < hoy) {
    ultima = sumarDias(ultima, 1);
    golpes += procesarDia(repo, ultima);
    repo.setFechaProcesada(ultima);
  }
  return golpes;
}

export class ErrorNegocio extends Error {
  constructor(mensaje: string, public status = 400) { super(mensaje); }
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const MOTIVOS = ["olvido", "bajaron_ventas", "salud", "otro"] as const;
export type MotivoAtraso = (typeof MOTIVOS)[number];

/**
 * al_dia · en_mora · plan_pendiente (aceptó un plan pero aún no hace el 1er pago: Pareas sigue pegando)
 * reprogramado (plan en marcha) · derivado (gestor) · incumplido (se le pasó un pago del plan: sin beneficios)
 */
export type EstadoCliente = "al_dia" | "en_mora" | "plan_pendiente" | "reprogramado" | "derivado" | "incumplido";

// ------------------------------------------------------------------ base

function cargar(repo: Repo, clienteId: number) {
  const cliente = repo.cliente(clienteId);
  if (!cliente) throw new ErrorNegocio("Cliente no encontrado", 404);
  const credito = repo.creditoDeCliente(clienteId);
  if (!credito) throw new ErrorNegocio("El cliente no tiene crédito", 404);
  const cuotas = repo.cuotas(credito.id);
  const propuestas = repo.propuestasDeCredito(credito.id);
  const regalo = regaloVigente(repo, clienteId);
  return { cliente, credito, cuotas, propuestas, regalo };
}

function regaloVigente(repo: Repo, clienteId: number): CampanaRow | undefined {
  const hoy = repo.fechaHoy();
  return repo.campanasDeCliente(clienteId).find((c) => c.estado === "ofrecida" && c.vence >= hoy);
}

const vencidas = (cuotas: CuotaRow[]) => cuotas.filter((c) => c.pagada === 0);
const diasAtrasoDe = (cuotas: CuotaRow[]) => Math.max(0, ...vencidas(cuotas).map((c) => c.dias_atraso));
const propuestaActiva = (ps: PropuestaRow[]) => ps.find((p) => p.estado === "aceptada");
const propuestaDerivada = (ps: PropuestaRow[]) => ps.find((p) => p.estado === "derivada");

export function reglasDe(credito: CreditoRow, cuotas: CuotaRow[], propuestas: PropuestaRow[]): CreditoReglas {
  const v = vencidas(cuotas);
  return {
    diasAtraso: diasAtrasoDe(cuotas),
    montoVencido: r2(v.reduce((s, c) => s + c.monto, 0)),
    interesMoratorio: r2(v.reduce((s, c) => s + c.interes_moratorio, 0)),
    reprogramacionActiva: !!propuestaActiva(propuestas),
  };
}

const planIniciado = (p: PropuestaRow) => p.cronograma.some((x) => x.pagado);

function estadoDe(cliente: ClienteRow, cuotas: CuotaRow[], propuestas: PropuestaRow[]): EstadoCliente {
  const activa = propuestaActiva(propuestas);
  if (activa) return planIniciado(activa) ? "reprogramado" : "plan_pendiente";
  const dias = diasAtrasoDe(cuotas);
  if (dias === 0) return "al_dia";
  if (cliente.sin_beneficios) return "incumplido";
  if (propuestaDerivada(propuestas) || dias > 60) return "derivado";
  return "en_mora";
}

/** Aplica un movimiento al score y recalcula (auditable en movimientos_score). */
function moverScore(repo: Repo, clienteId: number, tipo: Movimiento["tipo"], puntos: number, detalle: string) {
  repo.insertarMovimiento(clienteId, tipo, puntos, detalle, repo.fechaHoy());
  const r = recalcularScore(
    { movimientos: (id) => repo.movimientos(id), actualizarScore: (id, s, n) => repo.actualizarScoreCliente(id, s, n) },
    clienteId,
  );
  repo.guardarSaldos(clienteId, r.detalle.map((d) => d.saldo));
  return r;
}

const primerNombre = (nombres: string) => nombres.split(" ")[0];

// ------------------------------------------------------------------ situación del cliente

export function situacion(clienteId: number) {
  const repo = getRepo();
  const { cliente, credito, cuotas, propuestas, regalo } = cargar(repo, clienteId);
  const hoy = repo.fechaHoy();
  const cr = reglasDe(credito, cuotas, propuestas);
  const estado = estadoDe(cliente, cuotas, propuestas);
  const sinBeneficios = !!cliente.sin_beneficios;
  const activa = propuestaActiva(propuestas);
  const derivada = propuestaDerivada(propuestas);
  const sig = puntosParaSiguienteNivel(cliente.score);
  const nombre = primerNombre(cliente.nombres);
  const deuda = r2(cr.montoVencido + cr.interesMoratorio);

  const n = vencidas(cuotas).length;
  const pendiente = `${n === 1 ? "una cuota pendiente" : `${n} cuotas pendientes`} por ${soles(cr.montoVencido)} desde hace ${cr.diasAtraso} ${cr.diasAtraso === 1 ? "día" : "días"}`;
  let saludo: string;
  if (regalo) saludo = `Hola, ${nombre}. Tiene ${pendiente}. La Caja le otorgó un Modo Rescate para ponerse al día.`;
  else if (estado === "reprogramado") saludo = `Hola, ${nombre}. Su plan de pago está en marcha. Cumplirlo le suma puntos y mejora su nivel.`;
  else if (estado === "plan_pendiente") saludo = `Hola, ${nombre}. Su plan está aceptado. Realice el primer pago para activarlo y detener el CHICOTAZO.`;
  else if (estado === "al_dia") saludo = `Hola, ${nombre}. Está al día con sus pagos. Gracias por su puntualidad.`;
  else if (estado === "incumplido") saludo = `Hola, ${nombre}. No se registró un pago de su plan y tiene ${pendiente}. Al pagar lo pendiente, Pareas deja de restar puntos.`;
  else saludo = `Hola, ${nombre}. Tiene ${pendiente}. Veamos juntos cómo ponerse al día.`;

  return {
    fechaHoy: hoy,
    fechaHoyLarga: fechaLarga(hoy),
    cliente: { id: cliente.id, nombres: cliente.nombres, nombre, dni: cliente.dni_mascara, negocio: cliente.negocio, zona: cliente.zona },
    credito: { id: credito.id, tipo: credito.tipo_credito, cuotaMensual: credito.cuota_mensual, cuotasPendientes: credito.cuotas_pendientes, tea: credito.tea },
    estado,
    saludo,
    diasAtraso: cr.diasAtraso,
    deuda: {
      total: deuda,
      montoVencido: cr.montoVencido,
      interesMoratorio: cr.interesMoratorio,
      cuotas: vencidas(cuotas).map((c) => ({ monto: c.monto, vencio: c.fecha_vencimiento, vencioLargo: fechaLarga(c.fecha_vencimiento), diasAtraso: c.dias_atraso, interes: c.interes_moratorio })),
    },
    score: cliente.score,
    nivel: cliente.nivel,
    siguienteNivel: sig.siguiente ? { nivel: sig.siguiente, faltan: sig.faltan, texto: `Le faltan ${sig.faltan} puntos para ${sig.siguiente}` } : { nivel: null, faltan: 0, texto: "¡Estás en el nivel más alto!" },
    sinBeneficios,
    beneficios: beneficiosDeNivel(cliente.nivel, sinBeneficios),
    pareas: estadoPareas({ nombre, diasAtraso: cr.diasAtraso, score: cliente.score, sinBeneficios, regaloDisponible: !!regalo }),
    limites: activa || sinBeneficios || deuda <= 0 ? null : limitesPara(cr, { score: cliente.score }, hoy),
    regalo: regalo ? presentarRegalo(regalo) : null,
    chicotazo: resumenChicotazo(repo.movimientos(clienteId), cr.diasAtraso),
    propuestaActiva: activa ? presentarPropuesta(activa) : null,
    propuestaDerivada: derivada ? presentarPropuesta(derivada) : null,
    historialScore: repo.movimientosDetalle(clienteId, 15),
  };
}

/** El CHICOTAZO en cifras: cuántos golpes dio Pareas en este módulo y cuántos puntos costaron. */
function resumenChicotazo(movs: Movimiento[], diasAtraso: number) {
  const golpes = movs.filter((m) => m.tipo === "chicotazo_mora" && (m.detalle ?? "").startsWith("Día"));
  return {
    activo: diasAtraso > 0,
    porDia: PARAMS_SCORE.chicotazoPorDia,
    diasEnMora: diasAtraso,
    golpes: golpes.length,
    puntosPerdidos: golpes.reduce((s, m) => s + m.puntos, 0),
    topeTriviaDia: PARAMS_SCORE.topeTriviaDia,
  };
}

function presentarRegalo(c: CampanaRow) {
  return {
    id: c.id, base: c.base, descuento: c.descuento, montoHoy: c.monto_hoy, vence: c.vence, venceLargo: fechaLarga(c.vence), estado: c.estado,
    descuentoPct: Math.round(REGALO_SALVADOR.descuentoPct * 100), recargoPct: Math.round(REGALO_SALVADOR.recargoPct * 100),
    recargos: c.recargos.map((r) => ({ ...r, fechaLarga: fechaLarga(r.fecha) })),
  };
}

function presentarPropuesta(p: PropuestaRow) {
  return {
    id: p.id, estado: p.estado, iniciado: planIniciado(p), nCuotas: p.n_cuotas, inicial: p.inicial, motivo: p.motivo_atraso,
    pagos: p.cronograma.map((x) => ({ ...x, fechaLarga: fechaLarga(x.fecha) })),
    total: r2(p.cronograma.reduce((s, x) => s + x.monto, 0)),
  };
}

// ------------------------------------------------------------------ simulador

export interface EntradaPlan { creditoId?: number; clienteId?: number; nCuotas: unknown; inicial: unknown; fechaPrimerPago: unknown }

function sanear(e: EntradaPlan, hoy: string): PropuestaPlan {
  const nCuotas = Number(e.nCuotas), inicial = Number(e.inicial);
  if (!Number.isFinite(nCuotas) || !Number.isFinite(inicial)) throw new ErrorNegocio("Datos de la propuesta inválidos");
  const f = typeof e.fechaPrimerPago === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.fechaPrimerPago) ? e.fechaPrimerPago : hoy;
  return { nCuotas: Math.round(nCuotas), inicial: r2(inicial), fechaPrimerPago: f };
}

function clienteDeCredito(repo: Repo, creditoId: number): number {
  const c = repo.clientes().find((x) => repo.creditoDeCliente(x.id)?.id === creditoId);
  if (!c) throw new ErrorNegocio("Crédito no encontrado", 404);
  return c.id;
}

export function simular(e: EntradaPlan) {
  const repo = getRepo();
  const clienteId = e.clienteId ?? (e.creditoId ? clienteDeCredito(repo, e.creditoId) : NaN);
  if (!Number.isFinite(clienteId)) throw new ErrorNegocio("Falta creditoId o clienteId");
  const { cliente, credito, cuotas, propuestas } = cargar(repo, clienteId);
  const hoy = repo.fechaHoy();
  const plan = sanear(e, hoy);
  const v = validarPropuesta(reglasDe(credito, cuotas, propuestas), { score: cliente.score, sinBeneficios: !!cliente.sin_beneficios }, plan, hoy);
  // Un solo evento de simulación por minuto, para no inundar el feed del banco mientras mueve los sliders
  const ultima = repo.eventosDeCliente(clienteId).find((x) => x.tipo === "simulacion");
  if (!ultima || Date.now() - Date.parse(ultima.creado_en) > 60000) repo.insertarEvento(clienteId, "simulacion", { nCuotas: plan.nCuotas, inicial: plan.inicial });
  return {
    plan,
    fechaHoy: hoy,
    cronograma: { ...v.cronograma, pagos: v.cronograma.pagos.map((p) => ({ ...p, fechaLarga: fechaLarga(p.fecha) })) },
    total: v.cronograma.total,
    validacion: {
      aceptable: v.aceptable,
      resultado: v.resultado,
      semaforo: v.resultado === "automatica" ? "verde" : v.resultado === "derivada" ? "ambar" : "ambar",
      motivos: v.motivos,
      mensaje: mensajeValidacion(v.resultado, v.motivos),
      contrapropuesta: v.contrapropuesta,
      limites: v.limites,
    },
  };
}

function mensajeValidacion(resultado: string, motivos: string[]): string {
  if (resultado === "automatica") return "Su plan cumple las condiciones y se aprueba de inmediato. Se activa con el primer pago.";
  if (resultado === "derivada") return "Su propuesta cumple lo mínimo, pero por los días de atraso la revisará un gestor, que se comunicará con usted.";
  if (resultado === "no_disponible") return motivos[0] ?? "No es posible reprogramar ahora.";
  return "Este plan aún no cumple las condiciones, pero le ofrecemos una alternativa muy cercana.";
}

// ------------------------------------------------------------------ propuesta

export async function registrarPropuesta(e: EntradaPlan & { motivo?: unknown; acepta?: unknown }) {
  const repo = getRepo();
  const clienteId = e.clienteId ?? (e.creditoId ? clienteDeCredito(repo, e.creditoId) : NaN);
  if (!Number.isFinite(clienteId)) throw new ErrorNegocio("Falta creditoId o clienteId");
  if (e.acepta !== true) throw new ErrorNegocio("Debe aceptar las condiciones para enviar su propuesta");
  const motivo = MOTIVOS.includes(e.motivo as MotivoAtraso) ? (e.motivo as MotivoAtraso) : null;
  if (!motivo) throw new ErrorNegocio("Indíquenos qué ocurrió este mes para continuar");
  const { cliente, credito, cuotas, propuestas } = cargar(repo, clienteId);
  const hoy = repo.fechaHoy();
  if (propuestaDerivada(propuestas)) throw new ErrorNegocio("Su propuesta ya fue enviada a un gestor. Pronto se comunicará con usted.");
  const plan = sanear(e, hoy);
  const cr = reglasDe(credito, cuotas, propuestas);
  const v = validarPropuesta(cr, { score: cliente.score, sinBeneficios: !!cliente.sin_beneficios }, plan, hoy);
  if (v.resultado !== "automatica" && v.resultado !== "derivada") {
    throw new ErrorNegocio(v.motivos[0] ?? "La propuesta no cumple las condiciones");
  }
  const pagos: PagoPlan[] = v.cronograma.pagos.map((p) => ({ ...p, pagado: false }));
  const estado = v.resultado === "automatica" ? "aceptada" : "derivada";
  const prop = repo.crearPropuesta({ credito_id: credito.id, n_cuotas: plan.nCuotas, inicial: plan.inicial, fecha_primer_pago: plan.fechaPrimerPago, cronograma: pagos, estado, motivo_atraso: motivo });
  // Ojo: aceptar el plan NO detiene el chicotazo. Recién con el primer pago las cuotas pasan a "en plan".
  repo.insertarEvento(clienteId, "propuesta_enviada", { estado, nCuotas: plan.nCuotas, inicial: plan.inicial, total: v.cronograma.total, motivo });
  return { estado, propuesta: presentarPropuesta(prop), situacion: situacion(clienteId) };
}

export function pedirAyudaHumana(clienteId: number, nota?: string) {
  const repo = getRepo();
  cargar(repo, clienteId);
  repo.insertarEvento(clienteId, "ayuda_humana", { nota: nota?.slice(0, 200) ?? "Quiere hablar con una persona" });
  return { ok: true, mensaje: "Listo. Un gestor se comunicará con usted pronto." };
}

export function registrarEventoCliente(clienteId: number, tipo: "modulo_abierto" | "chat", detalle: Record<string, unknown> = {}) {
  const repo = getRepo();
  cargar(repo, clienteId);
  return repo.insertarEvento(clienteId, tipo, detalle);
}

// ------------------------------------------------------------------ trivia

function hashNum(n: number): number {
  let x = (n ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/** Las 5 preguntas del día para este cliente: orden determinista por cliente y fecha. */
function preguntasDelDia(repo: Repo, clienteId: number, hoy: string) {
  const dia = diferenciaDias("2026-01-01", hoy);
  return repo.preguntas()
    .map((p) => ({ p, k: hashNum(clienteId * 100003 + dia * 7919 + p.id) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, PARAMS_SCORE.preguntasPorDia)
    .map((x) => x.p);
}

export function triviaSiguiente(clienteId: number) {
  const repo = getRepo();
  cargar(repo, clienteId);
  const hoy = repo.fechaHoy();
  const del = preguntasDelDia(repo, clienteId, hoy);
  const resp = repo.respuestasDelDia(clienteId, hoy);
  const hechas = new Set(resp.map((r) => r.pregunta_id));
  const pendiente = del.find((p) => !hechas.has(p.id));
  const puntosHoy = triviaPuntosHoy(repo, clienteId, hoy);
  return {
    progreso: { respondidas: resp.length, total: del.length, aciertos: resp.filter((r) => r.acerto).length, completo: !pendiente, puntosTriviaHoy: puntosHoy, topeDia: PARAMS_SCORE.topeTriviaDia },
    // La respuesta correcta NO viaja al cliente
    pregunta: pendiente ? { id: pendiente.id, categoria: pendiente.categoria, pregunta: pendiente.pregunta, opciones: pendiente.opciones } : null,
    mensaje: pendiente ? null : `¡Completaste la trivia de hoy, ${APELATIVO}! Vuelve mañana por más puntos.`,
  };
}

function triviaPuntosHoy(repo: Repo, clienteId: number, hoy: string): number {
  return repo.movimientos(clienteId).filter((m) => m.tipo === "trivia" && m.fecha === hoy).reduce((s, m) => s + m.puntos, 0);
}

function reaccionTrivia(acerto: boolean, enMora: boolean): string {
  if (enMora) return acerto
    ? `¡Eso, ${APELATIVO}! Pero ojo: con la cuota pendiente el CHICOTAZO sigue. Ponte al día y vuelan tus puntos.`
    : `No pasa nada, ${APELATIVO}, a la próxima le atinas. Y no te olvides de tu cuota, que el CHICOTAZO no perdona.`;
  return acerto ? `¡Bacán, ${APELATIVO}! Así se juega. Sigue sumando.` : `Tranqui, ${APELATIVO}, de los errores se aprende. ¡Dale con la siguiente!`;
}

export function responderTrivia(clienteId: number, preguntaId: number, opcion: number) {
  const repo = getRepo();
  const { cuotas } = cargar(repo, clienteId);
  const hoy = repo.fechaHoy();
  const del = preguntasDelDia(repo, clienteId, hoy);
  const pregunta = del.find((p) => p.id === preguntaId);
  if (!pregunta) throw new ErrorNegocio("Esa pregunta no es parte de la trivia de hoy");
  if (repo.respuestasDelDia(clienteId, hoy).some((r) => r.pregunta_id === preguntaId)) throw new ErrorNegocio("Ya respondiste esta pregunta, compare");
  if (!Number.isInteger(opcion) || opcion < 0 || opcion >= pregunta.opciones.length) throw new ErrorNegocio("Elige una de las opciones, compare");
  const acerto = opcion === pregunta.correcta;
  repo.registrarRespuesta(clienteId, preguntaId, acerto, hoy);

  let puntos = 0;
  if (acerto) {
    puntos = triviaPermitida(triviaPuntosHoy(repo, clienteId, hoy));
    if (puntos > 0) moverScore(repo, clienteId, "trivia", puntos, `Trivia: ${pregunta.categoria}`);
  }
  const resp = repo.respuestasDelDia(clienteId, hoy);
  const completo = resp.length >= del.length;
  let racha = 0;
  if (completo) {
    racha = rachaPermitida(diasAtrasoDe(cuotas));
    if (racha > 0) moverScore(repo, clienteId, "racha", racha, "Trivia del día completada");
  }
  repo.insertarEvento(clienteId, "trivia_jugada", { acerto, categoria: pregunta.categoria });
  const sit = situacion(clienteId);
  return {
    acerto,
    correcta: pregunta.correcta,
    explicacion: pregunta.explicacion,
    puntosGanados: puntos,
    puntosRacha: racha,
    mensaje: acerto
      ? puntos > 0 ? `¡Chévere, le diste! +${puntos} puntos.` : "¡Bien ahí! Pero hoy ya llegaste al tope de puntos de la trivia."
      : `Uy, no era esa, ${APELATIVO}. Pero ya aprendiste algo nuevo.`,
    mensajeRacha: completo ? (racha > 0 ? `¡Racha del día completada! +${racha} puntos.` : "Completaste la trivia de hoy. Ojo: con una cuota pendiente la racha no suma; apenas te pongas al día, vuelve a sumar.") : null,
    score: sit.score, nivel: sit.nivel,
    // Dentro del juego Pareas habla en tono coloquial (fuera de la trivia, el tono es formal)
    pareas: { humor: sit.pareas.humor, mensaje: reaccionTrivia(acerto, sit.diasAtraso > 0) },
    progreso: triviaSiguiente(clienteId).progreso,
  };
}

// ------------------------------------------------------------------ pagos

function proximoPago(prop: PropuestaRow): PagoPlan | undefined {
  return prop.cronograma.find((p) => !p.pagado);
}

export type ConceptoPago = "regalo" | "cuota" | "deuda" | "nada";

/** Qué se pagaría ahora y cuánto (sirve también para generar el QR compartible). */
export async function cobroPendiente(clienteId: number) {
  const repo = getRepo();
  const { cliente, credito, cuotas, propuestas, regalo } = cargar(repo, clienteId);
  const activa = propuestaActiva(propuestas);
  let concepto: ConceptoPago = "nada", monto = 0, detalle = "";
  if (regalo) {
    concepto = "regalo"; monto = regalo.monto_hoy;
    detalle = `Modo Rescate: paga ${Math.round(REGALO_SALVADOR.descuentoPct * 100)}% menos hoy`;
  } else if (activa) {
    const p = proximoPago(activa);
    if (p) { concepto = "cuota"; monto = p.monto; detalle = p.tipo === "inicial" ? "Inicial de su plan de pago" : `Cuota ${p.n} de ${activa.n_cuotas} de su plan de pago`; }
  } else {
    const cr = reglasDe(credito, cuotas, propuestas);
    monto = r2(cr.montoVencido + cr.interesMoratorio);
    if (monto > 0) { concepto = "deuda"; detalle = "Cuotas vencidas más interés moratorio a la fecha"; }
  }
  const codigo = `PAD-${cliente.id}-${repo.fechaHoy().replace(/-/g, "")}-${Math.round(monto * 100)}`;
  const qr = concepto === "nada" ? null : await QRCode.toDataURL(`PONTEALDIA|${codigo}|${monto.toFixed(2)}|PEN`, { margin: 1, width: 240 });
  return { concepto, monto, detalle, codigo, qr, montoTexto: soles(monto), pagadorSugerido: cliente.nombres };
}

/** Marca como pagadas todas las cuotas vencidas o en plan, y cierra la mora. */
function cancelarVencidas(repo: Repo, credito: CreditoRow, cuotas: CuotaRow[]) {
  for (const c of cuotas.filter((x) => x.pagada !== 1)) repo.actualizarCuota(c.id, { pagada: 1 });
  repo.actualizarDiasCredito(credito.id, 0);
}

export async function registrarPago(clienteId: number, concepto?: string) {
  const repo = getRepo();
  const { credito, cuotas, propuestas, regalo } = cargar(repo, clienteId);
  const hoy = repo.fechaHoy();
  const cobro = await cobroPendiente(clienteId);
  if (cobro.concepto === "nada") throw new ErrorNegocio("No tiene pagos pendientes. Está al día.");
  if (concepto && concepto !== cobro.concepto) throw new ErrorNegocio("El pago pendiente cambió. Por favor, actualice la pantalla.");

  const mensajes: string[] = [];
  if (cobro.concepto === "regalo" && regalo) {
    cancelarVencidas(repo, credito, cuotas);
    repo.actualizarEstadoCampana(regalo.id, "usada");
    repo.setSinBeneficios(clienteId, false);
    for (const p of propuestas.filter((x) => x.estado === "aceptada" || x.estado === "derivada")) repo.actualizarPropuesta(p.id, { estado: "rechazada" });
    repo.insertarEvento(clienteId, "regalo_usado", { monto: regalo.monto_hoy, descuento: regalo.descuento });
    mensajes.push(`Se puso al día con el Modo Rescate y ahorró ${soles(regalo.descuento)} hoy.`);
    mensajes.push(`Sus próximas ${regalo.recargos.length} cuotas tendrán un recargo de ${regalo.recargos.map((r) => soles(r.monto)).join(", ")} para recuperar el descuento.`);
    mensajes.push("Recuperó sus beneficios y el CHICOTAZO se detuvo.");
  } else if (cobro.concepto === "deuda") {
    cancelarVencidas(repo, credito, cuotas);
    mensajes.push("Se puso al día. El CHICOTAZO se detuvo y su puntaje vuelve a subir con la trivia.");
    const der = propuestaDerivada(propuestas);
    if (der) repo.actualizarPropuesta(der.id, { estado: "cumplida" });
  } else {
    const activa = propuestaActiva(propuestas)!;
    const p = proximoPago(activa)!;
    const eraPrimerPago = !planIniciado(activa);
    const pagos = activa.cronograma.map((x) => (x === p ? { ...x, pagado: true } : x));
    repo.actualizarPropuesta(activa.id, { cronograma: pagos });
    if (eraPrimerPago) {
      // Recién con el primer pago la deuda vencida queda "en plan" y Pareas deja de pegar
      for (const c of vencidas(cuotas)) repo.actualizarCuota(c.id, { pagada: 2 });
      repo.actualizarDiasCredito(credito.id, 0);
      mensajes.push("Su plan está activo. El CHICOTAZO se detiene mientras cumpla sus fechas.");
    }
    if (hoy <= p.fecha) {
      moverScore(repo, clienteId, "pago_puntual", PARAMS_SCORE.pagoPuntual, `Pago a tiempo (${p.tipo === "inicial" ? "inicial" : `cuota ${p.n}`})`);
      mensajes.push(`¡Pago a tiempo! +${PARAMS_SCORE.pagoPuntual} puntos.`);
    }
    if (pagos.every((x) => x.pagado)) {
      repo.actualizarPropuesta(activa.id, { estado: "cumplida" });
      moverScore(repo, clienteId, "promesa_cumplida", PARAMS_SCORE.promesaCumplida, "Plan de pago cumplido");
      for (const c of repo.cuotas(credito.id).filter((x) => x.pagada === 2)) repo.actualizarCuota(c.id, { pagada: 1 });
      mensajes.push(`Cumplió su promesa de pago: +${PARAMS_SCORE.promesaCumplida} puntos.`);
    }
  }
  repo.insertarEvento(clienteId, "pago_registrado", { concepto: cobro.concepto, monto: cobro.monto });
  return {
    comprobante: { codigo: cobro.codigo, monto: cobro.monto, montoTexto: cobro.montoTexto, detalle: cobro.detalle, fecha: hoy, fechaLarga: fechaLarga(hoy), qr: cobro.qr },
    mensajes,
    situacion: situacion(clienteId),
  };
}

// ------------------------------------------------------------------ modo rescate (lo otorga el gestor)

export function otorgarRegalo(clienteId: number, gestor = "gestor") {
  const repo = getRepo();
  const { cliente, credito, cuotas, propuestas, regalo } = cargar(repo, clienteId);
  if (regalo) throw new ErrorNegocio("Este cliente ya tiene un Modo Rescate vigente.");
  const activa = propuestaActiva(propuestas);
  if (activa && planIniciado(activa)) throw new ErrorNegocio("El cliente tiene un plan en marcha; el Modo Rescate es para regularizar clientes en mora.");
  const cr = reglasDe(credito, cuotas, propuestas);
  const base = r2(cr.montoVencido + cr.interesMoratorio);
  if (cr.diasAtraso <= 0 || base <= 0) throw new ErrorNegocio("El cliente no está en mora.");
  const hoy = repo.fechaHoy();
  const calc = calcularRegaloSalvador(base, hoy);
  const c = repo.crearCampana({ cliente_id: cliente.id, tipo: "regalo_salvador", base: calc.base, descuento: calc.descuento, monto_hoy: calc.montoHoy, recargos: calc.recargos, estado: "ofrecida", otorgada_por: gestor, vence: sumarDias(hoy, REGALO_SALVADOR.vigenciaDias) });
  repo.insertarEvento(cliente.id, "regalo_otorgado", { montoHoy: calc.montoHoy, descuento: calc.descuento });
  return { ok: true, regalo: presentarRegalo(c) };
}

// ------------------------------------------------------------------ paso del tiempo (herramienta de pruebas)

/** Herramienta de prueba: adelanta un día la fecha del sistema y procesa ese día. */
export function avanzarDia() {
  const repo = getRepo();
  repo.setDiasAdelantados(repo.diasAdelantados() + 1);
  const golpes = sincronizarDias(repo);
  const nueva = repo.fechaHoy();
  return { fechaHoy: nueva, fechaHoyLarga: fechaLarga(nueva), clientesConChicotazo: golpes };
}

/** Procesa un día: sube la mora, Pareas da su CHICOTAZO y se evalúan planes y campañas vencidas. */
function procesarDia(repo: Repo, nueva: string) {
  const afectados: number[] = [];

  for (const c of repo.todasLasCampanas()) if (c.estado === "ofrecida" && c.vence < nueva) repo.actualizarEstadoCampana(c.id, "vencida");

  for (const cliente of repo.clientes()) {
    const credito = repo.creditoDeCliente(cliente.id);
    if (!credito) continue;
    let cuotas = repo.cuotas(credito.id);
    const propuestas = repo.propuestasDeCredito(credito.id);

    // Plan incumplido: un pago del plan venció sin pagarse → vuelve la mora y pierde beneficios (sin puntos fijos de castigo)
    const activa = propuestaActiva(propuestas);
    if (activa && activa.cronograma.some((p) => !p.pagado && p.fecha < nueva)) {
      repo.actualizarPropuesta(activa.id, { estado: "incumplida" });
      for (const c of cuotas.filter((x) => x.pagada === 2)) repo.actualizarCuota(c.id, { pagada: 0 });
      repo.setSinBeneficios(cliente.id, true);
      repo.insertarEvento(cliente.id, "promesa_incumplida", { propuestaId: activa.id });
      cuotas = repo.cuotas(credito.id);
    }
    // Corre la mora
    for (const c of cuotas.filter((x) => x.pagada === 0)) {
      const dias = Math.max(1, diferenciaDias(c.fecha_vencimiento, nueva));
      repo.actualizarCuota(c.id, { dias_atraso: dias, interes_moratorio: interesMoratorio(c.monto, dias, credito.tea) });
    }
    const dias = diasAtrasoDe(repo.cuotas(credito.id));
    repo.actualizarDiasCredito(credito.id, dias);
    // Chicotazo del día (una vez por fecha)
    if (dias > 0) {
      const yaGolpeado = repo.movimientosDetalle(cliente.id, 5).some((m) => m.tipo === "chicotazo_mora" && m.fecha === nueva);
      if (!yaGolpeado) { moverScore(repo, cliente.id, "chicotazo_mora", chicotazoDelDia(dias), `Día ${dias} en mora`); afectados.push(cliente.id); }
    }
  }
  return afectados.length;
}

export function reiniciarApp() {
  getRepo().reset();
  return { ok: true };
}

// ------------------------------------------------------------------ notificaciones del cliente

/** Cuántos días antes de una fecha de pago se avisa. */
export const DIAS_AVISO_PAGO = 3;

export type TipoNotificacion = "rescate" | "pago_cerca" | "mora" | "trivia";
export interface Notificacion { id: string; tipo: TipoNotificacion; titulo: string; mensaje: string; accion: "pagar" | "trivia" | "finanzas"; urgencia: number }

/**
 * Avisos para el cliente, en tono coloquial y con humor (como los de un pata que te cuida).
 * Montos, fechas y días se calculan aquí, en el servidor. El id es estable por día para no repetir avisos.
 */
export function notificacionesCliente(clienteId: number): Notificacion[] {
  const s = situacion(clienteId);
  const hoy = s.fechaHoy;
  const out: Notificacion[] = [];

  if (s.regalo) {
    out.push({ id: `rescate-${s.regalo.id}-${hoy}`, tipo: "rescate", urgencia: 3, accion: "pagar",
      titulo: "¡Te activaron el Modo Rescate!",
      mensaje: `Oe ${s.cliente.nombre}, paga ${soles(s.regalo.montoHoy)} (${s.regalo.descuentoPct}% menos) antes del ${s.regalo.venceLargo}. Aprovéchalo, ${APELATIVO}, sino te caerá el CHICOTAZO.` });
  }

  const plan = s.propuestaActiva;
  if (plan) {
    for (const p of plan.pagos.filter((x) => !x.pagado)) {
      const dias = diferenciaDias(hoy, p.fecha);
      if (dias < 0 || dias > DIAS_AVISO_PAGO) continue;
      const cuando = dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`;
      out.push({ id: `pago-${plan.id}-${p.n}-${hoy}`, tipo: "pago_cerca", urgencia: dias === 0 ? 3 : 2, accion: "pagar",
        titulo: dias === 0 ? "¡Hoy vence tu pago!" : `Tu pago vence ${cuando}`,
        mensaje: `${p.tipo === "inicial" ? "Tu inicial" : `Tu cuota ${p.n}`} de ${soles(p.monto)} vence ${cuando} (${p.fechaLarga}). Págala a tiempo, ${APELATIVO}, sino te caerá el CHICOTAZO.` });
      break; // basta con el pago más próximo
    }
  } else {
    // Cuota regular del crédito que se acerca
    const c = cuotaParaFinanzas(clienteId).proxima;
    if (c && c.diasFaltan <= DIAS_AVISO_PAGO) {
      const cuando = c.diasFaltan === 0 ? "hoy" : c.diasFaltan === 1 ? "mañana" : `en ${c.diasFaltan} días`;
      out.push({ id: `cuota-${c.fecha}-${hoy}`, tipo: "pago_cerca", urgencia: c.diasFaltan === 0 ? 3 : 2, accion: "pagar",
        titulo: c.diasFaltan === 0 ? "¡Hoy vence tu cuota!" : `Tu cuota vence ${cuando}`,
        mensaje: `Tu cuota de ${soles(c.monto)} vence ${cuando} (${fechaLarga(c.fecha)}). Sepárala a tiempo, ${APELATIVO}, sino te caerá el CHICOTAZO.` });
    }
  }

  if (s.diasAtraso > 0 && !s.regalo) {
    out.push({ id: `mora-${hoy}`, tipo: "mora", urgencia: 2, accion: "pagar",
      titulo: "¡Chas! Te cayó el CHICOTAZO",
      mensaje: `Llevas ${s.diasAtraso} ${s.diasAtraso === 1 ? "día" : "días"} de atraso y hoy Pareas te dio un CHICOTAZO de ${PARAMS_SCORE.chicotazoPorDia} puntos. Ponte al día y guarda el látigo, ${APELATIVO}.` });
  }

  const t = triviaSiguiente(clienteId).progreso;
  if (!t.completo) {
    const faltan = t.total - t.respondidas;
    const puntos = Math.max(0, t.topeDia - t.puntosTriviaHoy);
    out.push({ id: `trivia-${hoy}`, tipo: "trivia", urgencia: 1, accion: "trivia",
      titulo: "Tu trivia del día te espera",
      mensaje: `Te ${faltan === 1 ? "queda 1 pregunta" : `quedan ${faltan} preguntas`}: gana hasta +${puntos} puntos y sube tu score, ${APELATIVO}. ¡Dale que es rapidito!` });
  }
  return out.sort((a, b) => b.urgencia - a.urgencia);
}

// ------------------------------------------------------------------ banco

function mensajeEvento(e: EventoRow, nombre: string): string {
  const d = e.detalle as Record<string, any>;
  switch (e.tipo) {
    case "aviso_enviado": return `Se envió aviso a ${nombre}`;
    case "modulo_abierto": return `${nombre} abrió el módulo`;
    case "simulacion": return `${nombre} está simulando un plan`;
    case "propuesta_enviada":
      return d.estado === "aceptada"
        ? `${nombre} aceptó pagar en ${d.nCuotas} cuota${d.nCuotas === 1 ? "" : "s"}${d.inicial > 0 ? ` con inicial de ${soles(d.inicial)}` : ""}`
        : `${nombre} dejó una propuesta para el gestor (${d.nCuotas} cuotas)`;
    case "pago_registrado": return d.concepto === "regalo" ? `${nombre} se regularizó con el Modo Rescate (${soles(Number(d.monto))})` : `${nombre} pagó ${soles(Number(d.monto))}`;
    case "ayuda_humana": return `${nombre} pidió hablar con un gestor`;
    case "trivia_jugada": return `${nombre} jugó la trivia`;
    case "chat": return `${nombre} consultó al asistente`;
    case "promesa_incumplida": return `${nombre} incumplió su plan: pierde beneficios`;
    case "regalo_otorgado": return `Se otorgó un Modo Rescate a ${nombre} (paga ${soles(Number(d.montoHoy))} hoy)`;
    case "regalo_usado": return `${nombre} usó su Modo Rescate`;
    default: return `${nombre}: ${e.tipo}`;
  }
}

function nombreCorto(nombres: string): string {
  const p = nombres.split(" ");
  return p.length >= 2 ? `${p[0]} ${p[1][0]}.` : nombres;
}

export function feed(desde = 0, limite = 30) {
  const repo = getRepo();
  const nombres = new Map(repo.clientes().map((c) => [c.id, c.nombres]));
  const filas = desde > 0 ? repo.eventosDesde(desde, limite) : repo.ultimosEventos(limite).reverse();
  const importantes = new Set(["propuesta_enviada", "pago_registrado", "ayuda_humana", "modulo_abierto", "simulacion", "promesa_incumplida", "regalo_otorgado"]);
  const items = filas.filter((e) => importantes.has(e.tipo)).map((e) => ({
    id: e.id, tipo: e.tipo, clienteId: e.cliente_id, creadoEn: e.creado_en,
    texto: mensajeEvento(e, nombreCorto(nombres.get(e.cliente_id) ?? "Cliente")),
  }));
  const ultimoId = filas.length ? filas[filas.length - 1].id : desde;
  return { items, ultimoId };
}

export interface FiltrosCartera { tramo?: string; tipo?: string; estado?: string; zona?: string; q?: string }

export function cartera(f: FiltrosCartera = {}) {
  const repo = getRepo();
  const hoy = repo.fechaHoy();
  // Una consulta para todos (antes: una por cliente para eventos y otra para campañas)
  const conAyuda = new Set(repo.idsConEvento("ayuda_humana"));
  const conRegalo = new Set(repo.todasLasCampanas().filter((c) => c.estado === "ofrecida" && c.vence >= hoy).map((c) => c.cliente_id));
  const filas = repo.clientes().map((cliente) => {
    const credito = repo.creditoDeCliente(cliente.id)!;
    const cuotas = repo.cuotas(credito.id);
    const props = repo.propuestasDeCredito(credito.id);
    const cr = reglasDe(credito, cuotas, props);
    const estado = estadoDe(cliente, cuotas, props);
    const ayuda = conAyuda.has(cliente.id);
    const regaloVig = conRegalo.has(cliente.id);
    return {
      id: cliente.id, nombres: cliente.nombres, dni: cliente.dni_mascara, dniHash: cliente.dni_hash, zona: cliente.zona, negocio: cliente.negocio,
      tipoCredito: credito.tipo_credito, score: cliente.score, nivel: cliente.nivel, estado, pideAyuda: ayuda,
      sinBeneficios: !!cliente.sin_beneficios, regaloVigente: regaloVig,
      puedeRecibirRegalo: !regaloVig && cr.diasAtraso > 0 && estado !== "reprogramado",
      diasAtraso: cr.diasAtraso, deuda: r2(cr.montoVencido + cr.interesMoratorio),
      tramo: tramoDe(cr.diasAtraso),
    };
  });
  const q = f.q?.trim().toLowerCase();
  // DNI completo (8 dígitos): se compara por su hash, porque la base nunca guarda el DNI en claro
  const hashQ = q && /^\d{8}$/.test(q) ? createHash("sha256").update(q).digest("hex") : null;
  return filas.filter((x) =>
    (!f.tramo || x.tramo === f.tramo) &&
    (!f.tipo || x.tipoCredito === f.tipo) &&
    (!f.estado || x.estado === f.estado) &&
    (!f.zona || x.zona === f.zona) &&
    (!q || x.nombres.toLowerCase().includes(q) || x.dni.includes(q) || x.negocio.toLowerCase().includes(q) || x.dniHash === hashQ),
  ).map(({ dniHash: _, ...x }) => x);
}

function tramoDe(dias: number): string {
  return dias <= 0 ? "al_dia" : dias <= 15 ? "1-15" : dias <= 30 ? "16-30" : dias <= 60 ? "31-60" : ">60";
}

/** KPIs + casos derivados con una sola pasada por la cartera (para el panel del gestor). */
export function resumenBanco() {
  const lista = cartera();
  return { kpis: kpis(lista), derivados: derivados(lista) };
}

export function kpis(listaPrevia?: ReturnType<typeof cartera>) {
  const repo = getRepo();
  const props = repo.todasLasPropuestas();
  const aceptadas = props.filter((p) => p.estado === "aceptada" || p.estado === "cumplida" || p.estado === "incumplida");
  const total = (p: PropuestaRow) => r2(p.cronograma.reduce((s, x) => s + x.monto, 0));
  const resueltas = props.filter((p) => p.estado === "cumplida" || p.estado === "incumplida");
  const cumplidas = props.filter((p) => p.estado === "cumplida").length;
  const campanas = repo.todasLasCampanas();
  const lista = listaPrevia ?? cartera();
  return {
    avisosEnviados: repo.contarEventos("aviso_enviado"),
    modulosAbiertos: repo.clientesConEvento("modulo_abierto"),
    propuestasAceptadas: aceptadas.length,
    propuestasDerivadas: props.filter((p) => p.estado === "derivada").length,
    montoComprometido: r2(aceptadas.reduce((s, p) => s + total(p), 0)),
    tasaPromesaCumplida: resueltas.length ? Math.round((cumplidas / resueltas.length) * 100) : null,
    carteraEnMora: lista.filter((c) => c.diasAtraso > 0).length,
    deudaEnMora: r2(lista.reduce((s, c) => s + c.deuda, 0)),
    reprogramados: lista.filter((c) => c.estado === "reprogramado").length,
    incumplidos: lista.filter((c) => c.sinBeneficios).length,
    regalosOtorgados: campanas.length,
    regalosUsados: campanas.filter((c) => c.estado === "usada").length,
    derivados: derivados(lista).length,
  };
}

// ------------------------------------------------------------------ distribución de la cartera (gráfico del gestor)

export type GrupoCartera = "morosos" | "impagos" | "pagaron";
/** Morosos: en mora, plan sin primer pago o derivados. Impagos: incumplieron su plan. Pagaron: al día o pagando su plan. */
export const GRUPO_DE_ESTADO: Record<EstadoCliente, GrupoCartera> = {
  en_mora: "morosos", plan_pendiente: "morosos", derivado: "morosos",
  incumplido: "impagos",
  al_dia: "pagaron", reprogramado: "pagaron",
};

/** Cuántos clientes hay en cada grupo y su porcentaje (mismos filtros de la cartera, sin búsqueda por DNI). */
export function distribucionCartera(f: Omit<FiltrosCartera, "q"> = {}) {
  const lista = cartera({ tramo: f.tramo, tipo: f.tipo, estado: f.estado, zona: f.zona });
  const total = lista.length;
  const grupos = (["morosos", "impagos", "pagaron"] as GrupoCartera[]).map((g) => {
    const del = lista.filter((c) => GRUPO_DE_ESTADO[c.estado] === g);
    const n = del.length;
    return { grupo: g, clientes: n, pct: total ? Math.round((n / total) * 1000) / 10 : 0, deuda: r2(del.reduce((x, c) => x + c.deuda, 0)) };
  });
  return { total, grupos };
}

// ------------------------------------------------------------------ Modo Rescate masivo (desde un score mínimo)

/** Atajos que ve el gestor; puede escribir cualquier otro mínimo entre 0 y 100. */
export const ATAJOS_SCORE_RESCATE = [40, 50, 60, 70, 80] as const;

function scoreMinimo(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < PARAMS_SCORE.min || n > PARAMS_SCORE.max) throw new ErrorNegocio(`El score mínimo debe ser un número entero entre ${PARAMS_SCORE.min} y ${PARAMS_SCORE.max}.`);
  return n;
}

const elegiblesRescate = (lista: ReturnType<typeof cartera>, min: number) => lista.filter((c) => c.puedeRecibirRegalo && c.score >= min);

/** Cuántos clientes con score igual o mayor al mínimo pueden recibir hoy el Modo Rescate y cuánto deben. */
export function vistaPreviaRescate(minimo: unknown) {
  const min = scoreMinimo(minimo);
  const lista = cartera();
  const el = elegiblesRescate(lista, min);
  return {
    min, elegibles: el.length, deuda: r2(el.reduce((x, c) => x + c.deuda, 0)),
    conRescate: lista.filter((c) => c.regaloVigente && c.score >= min).length,
    atajos: ATAJOS_SCORE_RESCATE.map((m) => ({ min: m, elegibles: elegiblesRescate(lista, m).length })),
  };
}

/** Activa el Modo Rescate a todos los clientes elegibles con score igual o mayor al mínimo. */
export function otorgarRescateMasivo(minimo: unknown, gestor = "gestor") {
  const min = scoreMinimo(minimo);
  let otorgados = 0, omitidos = 0;
  for (const c of elegiblesRescate(cartera(), min)) {
    try { otorgarRegalo(c.id, gestor); otorgados++; } catch { omitidos++; }
  }
  return { min, otorgados, omitidos };
}

export function derivados(listaPrevia?: ReturnType<typeof cartera>) {
  const repo = getRepo();
  return (listaPrevia ?? cartera())
    .map((c) => {
      const motivos: string[] = [];
      if (c.diasAtraso > 60) motivos.push("Más de 60 días de atraso");
      if (c.estado === "derivado" && c.diasAtraso <= 60) motivos.push("Propuesta pendiente de revisión");
      if (c.sinBeneficios && c.diasAtraso > 0) motivos.push("Incumplió su plan: candidato a Modo Rescate");
      if (c.pideAyuda) motivos.push("Pidió ayuda humana");
      const credito = repo.creditoDeCliente(c.id)!;
      const prop = repo.propuestasDeCredito(credito.id).find((p) => p.estado === "derivada");
      return { ...c, motivos, propuesta: prop ? presentarPropuesta(prop) : null };
    })
    .filter((c) => c.motivos.length > 0 && c.estado !== "reprogramado" && c.diasAtraso > 0)
    .sort((a, b) => Number(b.sinBeneficios) - Number(a.sinBeneficios) || b.diasAtraso - a.diasAtraso);
}

export function detalleCliente(clienteId: number) {
  const repo = getRepo();
  const { cliente, credito, cuotas, propuestas, regalo } = cargar(repo, clienteId);
  const cr = reglasDe(credito, cuotas, propuestas);
  const estado = estadoDe(cliente, cuotas, propuestas);
  return {
    cliente: { id: cliente.id, nombres: cliente.nombres, dni: cliente.dni_mascara, telefono: cliente.telefono, zona: cliente.zona, negocio: cliente.negocio, score: cliente.score, nivel: cliente.nivel, sinBeneficios: !!cliente.sin_beneficios },
    credito: { tipo: credito.tipo_credito, montoDesembolsado: credito.monto_desembolsado, saldoCapital: credito.saldo_capital, tea: credito.tea, cuotaMensual: credito.cuota_mensual, cuotasPendientes: credito.cuotas_pendientes },
    estado,
    diasAtraso: cr.diasAtraso,
    deuda: { montoVencido: cr.montoVencido, interesMoratorio: cr.interesMoratorio, total: r2(cr.montoVencido + cr.interesMoratorio) },
    propuestas: propuestas.map(presentarPropuesta),
    regaloVigente: regalo ? presentarRegalo(regalo) : null,
    campanas: repo.campanasDeCliente(clienteId).map(presentarRegalo),
    puedeRecibirRegalo: !regalo && cr.diasAtraso > 0 && estado !== "reprogramado",
    vistaPreviaRegalo: !regalo && cr.diasAtraso > 0 ? calcularRegaloSalvador(r2(cr.montoVencido + cr.interesMoratorio), repo.fechaHoy()) : null,
    eventos: repo.eventosDeCliente(clienteId).map((e) => ({ id: e.id, tipo: e.tipo, creadoEn: e.creado_en, texto: mensajeEvento(e, nombreCorto(cliente.nombres)) })),
    historialScore: repo.movimientosDetalle(clienteId, 50),
  };
}

export function opcionesFiltros() {
  const repo = getRepo();
  const zonas = new Set<string>(), tipos = new Set<string>();
  for (const c of repo.clientes()) { zonas.add(c.zona); const cr = repo.creditoDeCliente(c.id); if (cr) tipos.add(cr.tipo_credito); }
  return { zonas: [...zonas].sort(), tipos: [...tipos].sort(), tramos: ["1-15", "16-30", "31-60", ">60", "al_dia"], estados: ["en_mora", "plan_pendiente", "reprogramado", "incumplido", "derivado", "al_dia"] };
}

// ------------------------------------------------------------------ Mis Finanzas (calculadora de ingresos y gastos)

/**
 * Lo que el cliente debe destinar a su crédito, para la calculadora. PUNTO DE INTEGRACIÓN con la calculadora de
 * mora del core: hoy se arma con las cuotas de la base local.
 */
export function cuotaParaFinanzas(clienteId: number): CuotaCredito {
  const repo = getRepo();
  const { credito, cuotas, propuestas, regalo } = cargar(repo, clienteId);
  const hoy = repo.fechaHoy();
  const cr = reglasDe(credito, cuotas, propuestas);
  const activa = propuestaActiva(propuestas);
  const conFecha = (fecha: string, monto: number, concepto: "cuota" | "plan") => ({ monto: r2(monto), fecha, diasFaltan: Math.max(0, diferenciaDias(hoy, fecha)), concepto });

  // Con un plan aceptado, lo que toca es el siguiente pago del plan (la deuda vencida ya está dentro del plan)
  const pagoPlan = activa?.cronograma.find((p) => !p.pagado);
  if (pagoPlan) return { proxima: conFecha(pagoPlan.fecha, pagoPlan.monto, "plan"), vencido: 0, conRescate: false };

  // Próxima cuota regular: un mes después de la última cuota conocida, hasta caer en una fecha futura
  let fecha = cuotas.length ? cuotas[cuotas.length - 1].fecha_vencimiento : sumarDias(hoy, 30);
  for (let i = 0; fecha <= hoy && i < 36; i++) fecha = sumarMeses(fecha, 1);
  const proxima = credito.cuotas_pendientes > 0 ? conFecha(fecha, credito.cuota_mensual, "cuota") : null;
  const vencido = regalo ? regalo.monto_hoy : r2(cr.montoVencido + cr.interesMoratorio);
  return { proxima, vencido: r2(vencido), conRescate: !!regalo };
}

function categoriasDe(repo: Repo, clienteId: number): Categoria[] {
  return [
    ...CATEGORIAS_BASE,
    ...repo.categoriasPropias(clienteId).map((c) => ({ id: `propia-${c.id}`, nombre: c.nombre, color: c.color, icono: c.icono as IconoCategoria, propia: true })),
  ];
}

/** Todo lo que muestra Mis Finanzas: resumen del mes, crédito, consejos, ingresos y gastos (calculado aquí). */
export function finanzasCliente(clienteId: number) {
  const repo = getRepo();
  cargar(repo, clienteId); // valida que exista
  const hoy = repo.fechaHoy();
  const ingresos = repo.ingresos(clienteId);
  const gastos = repo.gastos(clienteId);
  const categorias = categoriasDe(repo, clienteId);
  const credito = cuotaParaFinanzas(clienteId);
  const resumen = resumenMensual({ ingresos, gastos, credito, hoy });
  const mes = resumen.mes;
  return {
    hoy, mesLargo: fechaLarga(hoy).replace(/^\d+ de /, ""),
    resumen,
    credito: { ...credito, proxima: credito.proxima ? { ...credito.proxima, fechaLarga: fechaLarga(credito.proxima.fecha) } : null },
    consejos: consejosFinanzas(resumen, categorias),
    categorias,
    ingresos: ingresos.map((i) => ({ ...i, frecuenciaTexto: FRECUENCIAS[i.frecuencia].nombre, mensual: r2(i.monto * FRECUENCIAS[i.frecuencia].porMes), delMes: ingresoEnMes(i, mes), fechaLarga: fechaLarga(i.fecha) })),
    gastos: gastos.map((g) => ({ ...g, fechaLarga: fechaLarga(g.fecha), delMes: g.tipo === "fijo" ? g.fecha.slice(0, 7) <= mes : g.fecha.slice(0, 7) === mes })),
  };
}

type AccionFinanzas = "guardar_ingreso" | "borrar_ingreso" | "guardar_gasto" | "borrar_gasto" | "crear_categoria";

/** Altas, cambios y bajas de Mis Finanzas. Devuelve el módulo recalculado. */
export function accionFinanzas(clienteId: number, accion: AccionFinanzas, d: Record<string, any> = {}) {
  const repo = getRepo();
  cargar(repo, clienteId);
  const id = d.id === undefined || d.id === null || d.id === "" ? undefined : Number(d.id);
  try {
    switch (accion) {
      case "guardar_ingreso": {
        if (!(d.frecuencia in FRECUENCIAS)) throw new DatoInvalido("Elija cada cuánto recibe este ingreso.");
        const previo = id ? repo.ingresos(clienteId).find((x) => x.id === id) : undefined;
        if (id && !previo) throw new DatoInvalido("No encontramos ese ingreso.");
        repo.guardarIngreso(clienteId, { id, nombre: validarNombre(d.nombre, "el ingreso"), monto: validarMonto(d.monto), frecuencia: d.frecuencia, fecha: previo?.fecha ?? repo.fechaHoy() });
        break;
      }
      case "borrar_ingreso":
        if (!id || !repo.borrarIngreso(clienteId, id)) throw new DatoInvalido("No encontramos ese ingreso.");
        break;
      case "guardar_gasto": {
        if (!categoriasDe(repo, clienteId).some((c) => c.id === d.categoria)) throw new DatoInvalido("Elija una categoría para el gasto.");
        if (d.tipo !== "fijo" && d.tipo !== "variable") throw new DatoInvalido("Indique si el gasto es fijo o variable.");
        if (d.ambito !== "personal" && d.ambito !== "negocio") throw new DatoInvalido("Indique si el gasto es personal o del negocio.");
        if (id && !repo.gastos(clienteId).some((x) => x.id === id)) throw new DatoInvalido("No encontramos ese gasto.");
        repo.guardarGasto(clienteId, { id, nombre: validarNombre(d.nombre), monto: validarMonto(d.monto), categoria: d.categoria, fecha: d.fecha ? validarFecha(d.fecha, repo.fechaHoy()) : repo.fechaHoy(), tipo: d.tipo, ambito: d.ambito });
        break;
      }
      case "borrar_gasto":
        if (!id || !repo.borrarGasto(clienteId, id)) throw new DatoInvalido("No encontramos ese gasto.");
        break;
      case "crear_categoria": {
        const nombre = validarNombre(d.nombre, "la etiqueta");
        if (categoriasDe(repo, clienteId).some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) throw new DatoInvalido("Ya tiene una etiqueta con ese nombre.");
        if (repo.categoriasPropias(clienteId).length >= 12) throw new DatoInvalido("Ya tiene 12 etiquetas propias. Use una de las que ya creó.");
        const color = COLORES_ETIQUETA.includes(d.color) ? d.color : COLORES_ETIQUETA[0];
        const icono = ICONOS_ETIQUETA.includes(d.icono) ? d.icono : ICONOS_ETIQUETA[0];
        repo.crearCategoria(clienteId, { nombre, color, icono });
        break;
      }
      default:
        throw new DatoInvalido("Acción no reconocida.");
    }
  } catch (e) {
    if (e instanceof DatoInvalido) throw new ErrorNegocio(e.message);
    throw e;
  }
  return finanzasCliente(clienteId);
}

// ------------------------------------------------------------------ cartera en Excel (importar y exportar)

/** Una fila del Excel ya leída (los nombres de columna los resuelve lib/excel-cartera.ts). */
export interface FilaImportacion {
  fila: number;
  idSistema?: number; dni?: string; nombres?: string; telefono?: string; zona?: string; negocio?: string;
  tipoCredito?: string; montoDesembolsado?: number; saldoCapital?: number; tea?: number; cuotaMensual?: number;
  cuotasPendientes?: number; diasAtraso?: number; montoVencido?: number; yaPago?: boolean;
}
export interface ResultadoImportacion { filas: number; creados: number; actualizados: number; pagados: number; nuevaMora: number; errores: { fila: number; mensaje: string }[] }

const hashDni = (dni: string) => createHash("sha256").update(dni).digest("hex");
const tea = (v?: number) => (v === undefined ? undefined : v > 1 ? r2(v / 100) : v);

/** Pago total registrado fuera de la app (agencia, Excel del gestor): cancela lo vencido y cierra plan o campaña. */
function pagoEnAgencia(repo: Repo, clienteId: number): boolean {
  const { credito, cuotas, propuestas, regalo } = cargar(repo, clienteId);
  const pendientes = cuotas.filter((c) => c.pagada !== 1);
  const plan = propuestas.find((p) => p.estado === "aceptada" || p.estado === "derivada");
  if (!pendientes.length && !plan && !regalo) return false;
  const monto = r2(reglasDe(credito, cuotas, propuestas).montoVencido);
  cancelarVencidas(repo, credito, cuotas);
  if (plan) repo.actualizarPropuesta(plan.id, { estado: "cumplida", cronograma: plan.cronograma.map((x) => ({ ...x, pagado: true })) });
  if (regalo) repo.actualizarEstadoCampana(regalo.id, "vencida");
  repo.insertarEvento(clienteId, "pago_registrado", { concepto: "agencia", monto, origen: "excel" });
  return true;
}

/** Agrega clientes nuevos y actualiza los existentes (por ID del sistema o por DNI). Nunca borra a nadie. */
export function importarCartera(filas: FilaImportacion[]): ResultadoImportacion {
  const repo = getRepo();
  const hoy = repo.fechaHoy();
  const res: ResultadoImportacion = { filas: filas.length, creados: 0, actualizados: 0, pagados: 0, nuevaMora: 0, errores: [] };
  const error = (fila: number, mensaje: string) => res.errores.push({ fila, mensaje });

  for (const f of filas) {
    try {
      if (f.dni !== undefined && !/^\d{8}$/.test(f.dni) && !/^\*+\d{4}$/.test(f.dni)) { error(f.fila, "El DNI debe tener 8 dígitos."); continue; }
      for (const [k, v] of Object.entries({ "Cuota mensual": f.cuotaMensual, "Monto desembolsado": f.montoDesembolsado, "Saldo capital": f.saldoCapital, "Cuotas vencidas": f.montoVencido, "Días de atraso": f.diasAtraso, "Cuotas pendientes": f.cuotasPendientes, TEA: f.tea }))
        if (v !== undefined && (!Number.isFinite(v) || v < 0)) throw new ErrorNegocio(`${k}: debe ser un número positivo.`);
      const dniCompleto = f.dni && /^\d{8}$/.test(f.dni) ? f.dni : undefined;
      const existente = (f.idSistema ? repo.cliente(f.idSistema) : undefined) ?? (dniCompleto ? repo.clientePorDniHash(hashDni(dniCompleto)) : undefined);

      if (!existente) {
        if (!dniCompleto) { error(f.fila, "Cliente nuevo: escriba su DNI completo (8 dígitos)."); continue; }
        if (!f.nombres?.trim()) { error(f.fila, "Cliente nuevo: falta el nombre."); continue; }
        if (!f.tipoCredito?.trim()) { error(f.fila, "Cliente nuevo: falta el tipo de crédito."); continue; }
        if (!f.cuotaMensual) { error(f.fila, "Cliente nuevo: falta la cuota mensual."); continue; }
        const pendientes = Math.round(f.cuotasPendientes ?? 12);
        const dias = f.yaPago ? 0 : Math.round(f.diasAtraso ?? 0);
        const t = tea(f.tea) ?? 0.38;
        const { clienteId, creditoId } = repo.crearClienteConCredito(
          { nombres: f.nombres.trim(), dni_hash: hashDni(dniCompleto), dni_mascara: "****" + dniCompleto.slice(-4), telefono: f.telefono ?? "", zona: f.zona ?? "", negocio: f.negocio ?? "", score: PARAMS_SCORE.inicial, nivel: nivelDe(PARAMS_SCORE.inicial) },
          { tipo_credito: f.tipoCredito.trim(), monto_desembolsado: f.montoDesembolsado ?? r2(f.cuotaMensual * 12), saldo_capital: f.saldoCapital ?? r2(f.cuotaMensual * pendientes), tea: t, cuota_mensual: f.cuotaMensual, cuotas_pendientes: pendientes, dias_atraso: dias },
        );
        if (dias > 0) {
          const monto = f.montoVencido || f.cuotaMensual;
          repo.crearCuota(creditoId, monto, sumarDias(hoy, -dias), dias, interesMoratorio(monto, dias, t));
          repo.insertarEvento(clienteId, "aviso_enviado", { canal: "importacion" });
        }
        res.creados++;
        continue;
      }

      const { credito, cuotas } = cargar(repo, existente.id);
      repo.actualizarDatosCliente(existente.id, { nombres: f.nombres?.trim() || undefined, telefono: f.telefono || undefined, zona: f.zona || undefined, negocio: f.negocio || undefined });
      repo.actualizarCredito(credito.id, {
        tipo_credito: f.tipoCredito?.trim() || undefined, monto_desembolsado: f.montoDesembolsado, saldo_capital: f.saldoCapital,
        tea: tea(f.tea), cuota_mensual: f.cuotaMensual || undefined, cuotas_pendientes: f.cuotasPendientes === undefined ? undefined : Math.round(f.cuotasPendientes),
      });
      if (f.yaPago) { if (pagoEnAgencia(repo, existente.id)) res.pagados++; }
      else if ((f.diasAtraso ?? 0) > 0 && !cuotas.some((c) => c.pagada !== 1)) {
        // Un cliente al día que el Excel trae con atraso: se registra la cuota vencida
        const dias = Math.round(f.diasAtraso!);
        const monto = f.montoVencido || f.cuotaMensual || credito.cuota_mensual;
        repo.crearCuota(credito.id, monto, sumarDias(hoy, -dias), dias, interesMoratorio(monto, dias, tea(f.tea) ?? credito.tea));
        repo.actualizarDiasCredito(credito.id, dias);
        res.nuevaMora++;
      }
      res.actualizados++;
    } catch (e) {
      error(f.fila, e instanceof ErrorNegocio ? e.message : "No se pudo procesar esta fila.");
    }
  }
  return res;
}

const ETIQUETA_ESTADO: Record<EstadoCliente, string> = { al_dia: "Al día", en_mora: "En mora", plan_pendiente: "Plan sin primer pago", reprogramado: "Plan en marcha", derivado: "Derivado a gestor", incumplido: "Incumplió su plan" };

/** Filas para descargar la cartera en Excel, con su estado actualizado al día de hoy. */
export function filasExportacion() {
  const repo = getRepo();
  const lista = cartera();
  return lista.map((c) => {
    const { credito, cuotas, propuestas } = cargar(repo, c.id);
    const cr = reglasDe(credito, cuotas, propuestas);
    return {
      idSistema: c.id, dni: c.dni, nombres: c.nombres, telefono: repo.cliente(c.id)?.telefono ?? "", zona: c.zona, negocio: c.negocio,
      tipoCredito: credito.tipo_credito, montoDesembolsado: credito.monto_desembolsado, saldoCapital: credito.saldo_capital, tea: r2(credito.tea * 100),
      cuotaMensual: credito.cuota_mensual, cuotasPendientes: credito.cuotas_pendientes, diasAtraso: cr.diasAtraso, montoVencido: cr.montoVencido,
      yaPago: "", // lo llena el gestor con "Sí" para registrar un pago; vacío no cambia nada
      interesMoratorio: cr.interesMoratorio, deudaHoy: c.deuda, estado: ETIQUETA_ESTADO[c.estado], score: c.score, nivel: c.nivel,
      modoRescate: c.regaloVigente ? "Vigente" : "", fechaCorte: repo.fechaHoy(),
    };
  });
}
