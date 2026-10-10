// Lógica de negocio del módulo. TODOS los montos y fechas se calculan aquí (servidor); el cliente nunca los inventa.
import QRCode from "qrcode";
import { getRepo, type CampanaRow, type ClienteRow, type CreditoRow, type CuotaRow, type EventoRow, type PagoPlan, type PropuestaRow, type Repo } from "./db/repo";
import { diferenciaDias, fechaLarga, soles, sumarDias } from "./fecha";
import { calcularRegaloSalvador, interesMoratorio, limitesPara, REGALO_SALVADOR, validarPropuesta, type CreditoReglas, type PropuestaPlan } from "./reglas";
import { APELATIVO } from "./config";
import { beneficiosDeNivel, chicotazoDelDia, estadoPacaso, PARAMS_SCORE, puntosParaSiguienteNivel, rachaPermitida, recalcularScore, triviaPermitida, type Movimiento } from "./score";

export class ErrorNegocio extends Error {
  constructor(mensaje: string, public status = 400) { super(mensaje); }
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const MOTIVOS = ["olvido", "bajaron_ventas", "salud", "otro"] as const;
export type MotivoAtraso = (typeof MOTIVOS)[number];

/**
 * al_dia · en_mora · plan_pendiente (aceptó un plan pero aún no hace el 1er pago: el Pacaso sigue pegando)
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
  const hoy = repo.fechaDemo();
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
  repo.insertarMovimiento(clienteId, tipo, puntos, detalle, repo.fechaDemo());
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
  const hoy = repo.fechaDemo();
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
  if (regalo) saludo = `¡Habla, ${nombre}! Tienes ${pendiente}, pero hoy tienes una buena noticia: la Caja te dio un Regalo Salvador para ponerte al día.`;
  else if (estado === "reprogramado") saludo = `¡Habla, ${nombre}! Tu plan de pago está en marcha. Cumplirlo te suma puntos y mejora tu nivel. ¡Chévere!`;
  else if (estado === "plan_pendiente") saludo = `¡Habla, ${nombre}! Ya armaste tu plan, ${APELATIVO}. Haz tu primer pago para que arranque y el Pacaso deje de pegar.`;
  else if (estado === "al_dia") saludo = `¡Habla, ${nombre}! Estás al día con tus pagos. ¡Gracias por tu puntualidad, ${APELATIVO}!`;
  else if (estado === "incumplido") saludo = `Hola, ${nombre}. Se pasó un pago de tu plan y tienes ${pendiente}. Tranqui: paga lo pendiente y el Pacaso deja de pegar.`;
  else saludo = `¡Habla, ${nombre}! Tienes ${pendiente}. Tranqui, ${APELATIVO}: veamos juntos cómo ponerte al día.`;

  return {
    fechaDemo: hoy,
    fechaDemoLarga: fechaLarga(hoy),
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
    siguienteNivel: sig.siguiente ? { nivel: sig.siguiente, faltan: sig.faltan, texto: `Estás a ${sig.faltan} puntos de ${sig.siguiente}` } : { nivel: null, faltan: 0, texto: "¡Estás en el nivel más alto!" },
    sinBeneficios,
    beneficios: beneficiosDeNivel(cliente.nivel, sinBeneficios),
    pacaso: estadoPacaso({ nombre, diasAtraso: cr.diasAtraso, score: cliente.score, sinBeneficios, regaloDisponible: !!regalo }),
    limites: activa || sinBeneficios || deuda <= 0 ? null : limitesPara(cr, { score: cliente.score }, hoy),
    regalo: regalo ? presentarRegalo(regalo) : null,
    propuestaActiva: activa ? presentarPropuesta(activa) : null,
    propuestaDerivada: derivada ? presentarPropuesta(derivada) : null,
    historialScore: repo.movimientosDetalle(clienteId, 15),
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
  const hoy = repo.fechaDemo();
  const plan = sanear(e, hoy);
  const v = validarPropuesta(reglasDe(credito, cuotas, propuestas), { score: cliente.score, sinBeneficios: !!cliente.sin_beneficios }, plan, hoy);
  // Un solo evento de simulación por minuto, para no inundar el feed del banco mientras mueve los sliders
  const ultima = repo.eventosDeCliente(clienteId).find((x) => x.tipo === "simulacion");
  if (!ultima || Date.now() - Date.parse(ultima.creado_en) > 60000) repo.insertarEvento(clienteId, "simulacion", { nCuotas: plan.nCuotas, inicial: plan.inicial });
  return {
    plan,
    fechaDemo: hoy,
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
  if (resultado === "automatica") return "¡Chévere! Tu plan cumple las condiciones y se aprueba al toque. Arranca con tu primer pago.";
  if (resultado === "derivada") return "Tu propuesta cumple lo mínimo, pero por los días de atraso la revisará un gestor, que se comunicará contigo.";
  if (resultado === "no_disponible") return motivos[0] ?? "No es posible reprogramar ahora.";
  return `Uy ${APELATIVO}, así todavía no cumple, pero tenemos una alternativa bien parecida para ti.`;
}

// ------------------------------------------------------------------ propuesta

export async function registrarPropuesta(e: EntradaPlan & { motivo?: unknown; acepta?: unknown }) {
  const repo = getRepo();
  const clienteId = e.clienteId ?? (e.creditoId ? clienteDeCredito(repo, e.creditoId) : NaN);
  if (!Number.isFinite(clienteId)) throw new ErrorNegocio("Falta creditoId o clienteId");
  if (e.acepta !== true) throw new ErrorNegocio("Debes aceptar las condiciones para enviar tu propuesta");
  const motivo = MOTIVOS.includes(e.motivo as MotivoAtraso) ? (e.motivo as MotivoAtraso) : null;
  if (!motivo) throw new ErrorNegocio("Cuéntanos qué pasó este mes para continuar");
  const { cliente, credito, cuotas, propuestas } = cargar(repo, clienteId);
  const hoy = repo.fechaDemo();
  if (propuestaDerivada(propuestas)) throw new ErrorNegocio("Tu propuesta ya fue enviada a un gestor. Pronto se comunicará contigo.");
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
  return { ok: true, mensaje: "Listo. Un gestor se comunicará contigo pronto." };
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
  const hoy = repo.fechaDemo();
  const del = preguntasDelDia(repo, clienteId, hoy);
  const resp = repo.respuestasDelDia(clienteId, hoy);
  const hechas = new Set(resp.map((r) => r.pregunta_id));
  const pendiente = del.find((p) => !hechas.has(p.id));
  const puntosHoy = triviaPuntosHoy(repo, clienteId, hoy);
  return {
    progreso: { respondidas: resp.length, total: del.length, aciertos: resp.filter((r) => r.acerto).length, completo: !pendiente, puntosTriviaHoy: puntosHoy, topeDia: PARAMS_SCORE.topeTriviaDia },
    // La respuesta correcta NO viaja al cliente
    pregunta: pendiente ? { id: pendiente.id, categoria: pendiente.categoria, pregunta: pendiente.pregunta, opciones: pendiente.opciones } : null,
    mensaje: pendiente ? null : "¡Completaste la trivia de hoy! Vuelve mañana por más puntos.",
  };
}

function triviaPuntosHoy(repo: Repo, clienteId: number, hoy: string): number {
  return repo.movimientos(clienteId).filter((m) => m.tipo === "trivia" && m.fecha === hoy).reduce((s, m) => s + m.puntos, 0);
}

export function responderTrivia(clienteId: number, preguntaId: number, opcion: number) {
  const repo = getRepo();
  const { cuotas } = cargar(repo, clienteId);
  const hoy = repo.fechaDemo();
  const del = preguntasDelDia(repo, clienteId, hoy);
  const pregunta = del.find((p) => p.id === preguntaId);
  if (!pregunta) throw new ErrorNegocio("Esa pregunta no es parte de la trivia de hoy");
  if (repo.respuestasDelDia(clienteId, hoy).some((r) => r.pregunta_id === preguntaId)) throw new ErrorNegocio("Ya respondiste esta pregunta");
  const acerto = Number(opcion) === pregunta.correcta;
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
    if (racha > 0) moverScore(repo, clienteId, "racha", racha, "Completaste la trivia de hoy");
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
      ? puntos > 0 ? `¡Correcto! +${puntos} puntos.` : "¡Correcto! Hoy ya llegaste al tope de puntos por trivia."
      : "No fue esta vez, pero ya aprendiste algo nuevo.",
    mensajeRacha: completo ? (racha > 0 ? `¡Racha del día completada! +${racha} puntos.` : "Completaste la trivia de hoy. Mientras haya una cuota pendiente, la racha no suma puntos; al ponerte al día, vuelve a sumar.") : null,
    score: sit.score, nivel: sit.nivel, pacaso: sit.pacaso,
    progreso: triviaSiguiente(clienteId).progreso,
  };
}

// ------------------------------------------------------------------ pagos (simulados)

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
    detalle = `Regalo Salvador: pagas ${Math.round(REGALO_SALVADOR.descuentoPct * 100)}% menos hoy`;
  } else if (activa) {
    const p = proximoPago(activa);
    if (p) { concepto = "cuota"; monto = p.monto; detalle = p.tipo === "inicial" ? "Inicial de tu plan de pago" : `Cuota ${p.n} de ${activa.n_cuotas} de tu plan de pago`; }
  } else {
    const cr = reglasDe(credito, cuotas, propuestas);
    monto = r2(cr.montoVencido + cr.interesMoratorio);
    if (monto > 0) { concepto = "deuda"; detalle = "Cuotas vencidas más interés moratorio a la fecha"; }
  }
  const codigo = `PAD-${cliente.id}-${repo.fechaDemo().replace(/-/g, "")}-${Math.round(monto * 100)}`;
  const qr = concepto === "nada" ? null : await QRCode.toDataURL(`PONTEALDIA|${codigo}|${monto.toFixed(2)}|PEN`, { margin: 1, width: 240 });
  return { concepto, monto, detalle, codigo, qr, montoTexto: soles(monto), pagadorSugerido: cliente.nombres };
}

/** Marca como pagadas todas las cuotas vencidas o en plan, y cierra la mora. */
function cancelarVencidas(repo: Repo, credito: CreditoRow, cuotas: CuotaRow[]) {
  for (const c of cuotas.filter((x) => x.pagada !== 1)) repo.actualizarCuota(c.id, { pagada: 1 });
  repo.actualizarDiasCredito(credito.id, 0);
}

export async function pagoSimulado(clienteId: number, concepto?: string) {
  const repo = getRepo();
  const { credito, cuotas, propuestas, regalo } = cargar(repo, clienteId);
  const hoy = repo.fechaDemo();
  const cobro = await cobroPendiente(clienteId);
  if (cobro.concepto === "nada") throw new ErrorNegocio(`No tienes pagos pendientes. ¡Estás al día, ${APELATIVO}!`);
  if (concepto && concepto !== cobro.concepto) throw new ErrorNegocio("El pago pendiente cambió. Actualiza la pantalla.");

  const mensajes: string[] = [];
  if (cobro.concepto === "regalo" && regalo) {
    cancelarVencidas(repo, credito, cuotas);
    repo.actualizarEstadoCampana(regalo.id, "usada");
    repo.setSinBeneficios(clienteId, false);
    for (const p of propuestas.filter((x) => x.estado === "aceptada" || x.estado === "derivada")) repo.actualizarPropuesta(p.id, { estado: "rechazada" });
    repo.insertarEvento(clienteId, "regalo_usado", { monto: regalo.monto_hoy, descuento: regalo.descuento });
    mensajes.push(`¡Te pusiste al día con el Regalo Salvador! Ahorraste ${soles(regalo.descuento)} hoy.`);
    mensajes.push(`Tus próximas ${regalo.recargos.length} cuotas tendrán un recargo de ${regalo.recargos.map((r) => soles(r.monto)).join(", ")} para recuperar el descuento.`);
    mensajes.push("Recuperaste tus beneficios. ¡El Pacaso deja de pegar!");
  } else if (cobro.concepto === "deuda") {
    cancelarVencidas(repo, credito, cuotas);
    mensajes.push(`¡Te pusiste al día, ${APELATIVO}! El Pacaso deja de pegar y tus puntos vuelven a subir con la trivia.`);
    const der = propuestaDerivada(propuestas);
    if (der) repo.actualizarPropuesta(der.id, { estado: "cumplida" });
  } else {
    const activa = propuestaActiva(propuestas)!;
    const p = proximoPago(activa)!;
    const eraPrimerPago = !planIniciado(activa);
    const pagos = activa.cronograma.map((x) => (x === p ? { ...x, pagado: true } : x));
    repo.actualizarPropuesta(activa.id, { cronograma: pagos });
    if (eraPrimerPago) {
      // Recién con el primer pago la deuda vencida queda "en plan" y el Pacaso deja de pegar
      for (const c of vencidas(cuotas)) repo.actualizarCuota(c.id, { pagada: 2 });
      repo.actualizarDiasCredito(credito.id, 0);
      mensajes.push("¡Arrancó tu plan! El Pacaso deja de pegar mientras cumplas tus fechas.");
    }
    if (hoy <= p.fecha) {
      moverScore(repo, clienteId, "pago_puntual", PARAMS_SCORE.pagoPuntual, `Pago a tiempo (${p.tipo === "inicial" ? "inicial" : `cuota ${p.n}`})`);
      mensajes.push(`¡Pago a tiempo! +${PARAMS_SCORE.pagoPuntual} puntos.`);
    }
    if (pagos.every((x) => x.pagado)) {
      repo.actualizarPropuesta(activa.id, { estado: "cumplida" });
      moverScore(repo, clienteId, "promesa_cumplida", PARAMS_SCORE.promesaCumplida, "Cumpliste tu plan de pago");
      for (const c of repo.cuotas(credito.id).filter((x) => x.pagada === 2)) repo.actualizarCuota(c.id, { pagada: 1 });
      mensajes.push(`¡Cumpliste tu promesa de pago! +${PARAMS_SCORE.promesaCumplida} puntos. ¡Bacán, ${APELATIVO}!`);
    }
  }
  repo.insertarEvento(clienteId, "pago_simulado", { concepto: cobro.concepto, monto: cobro.monto });
  return {
    comprobante: { codigo: cobro.codigo, monto: cobro.monto, montoTexto: cobro.montoTexto, detalle: cobro.detalle, fecha: hoy, fechaLarga: fechaLarga(hoy), qr: cobro.qr, simulado: true },
    mensajes,
    situacion: situacion(clienteId),
  };
}

// ------------------------------------------------------------------ regalo salvador (lo otorga el gestor)

export function otorgarRegalo(clienteId: number, gestor = "gestor") {
  const repo = getRepo();
  const { cliente, credito, cuotas, propuestas, regalo } = cargar(repo, clienteId);
  if (regalo) throw new ErrorNegocio("Este cliente ya tiene un Regalo Salvador vigente.");
  const activa = propuestaActiva(propuestas);
  if (activa && planIniciado(activa)) throw new ErrorNegocio("El cliente tiene un plan en marcha; el regalo es para regularizar morosos.");
  const cr = reglasDe(credito, cuotas, propuestas);
  const base = r2(cr.montoVencido + cr.interesMoratorio);
  if (cr.diasAtraso <= 0 || base <= 0) throw new ErrorNegocio("El cliente no está en mora.");
  const hoy = repo.fechaDemo();
  const calc = calcularRegaloSalvador(base, hoy);
  const c = repo.crearCampana({ cliente_id: cliente.id, tipo: "regalo_salvador", base: calc.base, descuento: calc.descuento, monto_hoy: calc.montoHoy, recargos: calc.recargos, estado: "ofrecida", otorgada_por: gestor, vence: sumarDias(hoy, REGALO_SALVADOR.vigenciaDias) });
  repo.insertarEvento(cliente.id, "regalo_otorgado", { montoHoy: calc.montoHoy, descuento: calc.descuento });
  return { ok: true, regalo: presentarRegalo(c) };
}

// ------------------------------------------------------------------ paso del tiempo (demo)

/** Avanza un día la fecha de la demo: sube la mora, el Pacaso da su chicotazo y se evalúan planes y campañas vencidas. */
export function avanzarDia() {
  const repo = getRepo();
  const nueva = sumarDias(repo.fechaDemo(), 1);
  repo.setFechaDemo(nueva);
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
  return { fechaDemo: nueva, fechaDemoLarga: fechaLarga(nueva), clientesConChicotazo: afectados.length };
}

export function resetearDemo() {
  getRepo().reset();
  return { ok: true };
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
    case "pago_simulado": return d.concepto === "regalo" ? `${nombre} se regularizó con el Regalo Salvador (${soles(Number(d.monto))})` : `${nombre} pagó ${soles(Number(d.monto))}`;
    case "ayuda_humana": return `${nombre} pidió hablar con un gestor`;
    case "trivia_jugada": return `${nombre} jugó la trivia`;
    case "chat": return `${nombre} consultó al asistente`;
    case "promesa_incumplida": return `${nombre} incumplió su plan: pierde beneficios`;
    case "regalo_otorgado": return `🎁 Se otorgó un Regalo Salvador a ${nombre} (paga ${soles(Number(d.montoHoy))} hoy)`;
    case "regalo_usado": return `🎁 ${nombre} usó su Regalo Salvador`;
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
  const importantes = new Set(["propuesta_enviada", "pago_simulado", "ayuda_humana", "modulo_abierto", "simulacion", "promesa_incumplida", "regalo_otorgado"]);
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
  const hoy = repo.fechaDemo();
  const filas = repo.clientes().map((cliente) => {
    const credito = repo.creditoDeCliente(cliente.id)!;
    const cuotas = repo.cuotas(credito.id);
    const props = repo.propuestasDeCredito(credito.id);
    const cr = reglasDe(credito, cuotas, props);
    const estado = estadoDe(cliente, cuotas, props);
    const ayuda = repo.eventosDeCliente(cliente.id).some((e) => e.tipo === "ayuda_humana");
    const regaloVig = repo.campanasDeCliente(cliente.id).some((c) => c.estado === "ofrecida" && c.vence >= hoy);
    return {
      id: cliente.id, nombres: cliente.nombres, dni: cliente.dni_mascara, zona: cliente.zona, negocio: cliente.negocio,
      tipoCredito: credito.tipo_credito, score: cliente.score, nivel: cliente.nivel, estado, pideAyuda: ayuda,
      sinBeneficios: !!cliente.sin_beneficios, regaloVigente: regaloVig,
      puedeRecibirRegalo: !regaloVig && cr.diasAtraso > 0 && estado !== "reprogramado",
      diasAtraso: cr.diasAtraso, deuda: r2(cr.montoVencido + cr.interesMoratorio),
      tramo: tramoDe(cr.diasAtraso),
    };
  });
  const q = f.q?.trim().toLowerCase();
  return filas.filter((x) =>
    (!f.tramo || x.tramo === f.tramo) &&
    (!f.tipo || x.tipoCredito === f.tipo) &&
    (!f.estado || x.estado === f.estado) &&
    (!f.zona || x.zona === f.zona) &&
    (!q || x.nombres.toLowerCase().includes(q) || x.dni.includes(q) || x.negocio.toLowerCase().includes(q)),
  );
}

function tramoDe(dias: number): string {
  return dias <= 0 ? "al_dia" : dias <= 15 ? "1-15" : dias <= 30 ? "16-30" : dias <= 60 ? "31-60" : ">60";
}

export function kpis() {
  const repo = getRepo();
  const props = repo.todasLasPropuestas();
  const aceptadas = props.filter((p) => p.estado === "aceptada" || p.estado === "cumplida" || p.estado === "incumplida");
  const total = (p: PropuestaRow) => r2(p.cronograma.reduce((s, x) => s + x.monto, 0));
  const resueltas = props.filter((p) => p.estado === "cumplida" || p.estado === "incumplida");
  const cumplidas = props.filter((p) => p.estado === "cumplida").length;
  const campanas = repo.todasLasCampanas();
  const lista = cartera();
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
    derivados: derivados().length,
  };
}

export function derivados() {
  const repo = getRepo();
  return cartera()
    .map((c) => {
      const motivos: string[] = [];
      if (c.diasAtraso > 60) motivos.push("Más de 60 días de atraso");
      if (c.estado === "derivado" && c.diasAtraso <= 60) motivos.push("Propuesta pendiente de revisión");
      if (c.sinBeneficios && c.diasAtraso > 0) motivos.push("Incumplió su plan: candidato a Regalo Salvador");
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
    vistaPreviaRegalo: !regalo && cr.diasAtraso > 0 ? calcularRegaloSalvador(r2(cr.montoVencido + cr.interesMoratorio), repo.fechaDemo()) : null,
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
