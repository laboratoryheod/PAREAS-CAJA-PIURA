// REGLAS DE NEGOCIO SIMULADAS — un solo archivo editable.
// Todo número que el banco pueda querer ajustar en la hackathon vive aquí.
import { generarCronograma, type Cronograma } from "./cronograma";
import { diferenciaDias, sumarDias } from "./fecha";
import { nivelDe, type Nivel } from "./niveles";

/** Tasa moratoria = TEA del crédito × este factor, prorrateada por día (interés simple). Simulado. */
export const FACTOR_MORATORIO = 1.5;

export const REGLAS = {
  cuotaMinima: 20, // S/ — cada cuota de la propuesta debe ser ≥ este valor
  scoreBuenHistorial: 60, // tramo 16–30 días: desde este score no se pide inicial
  maxDiasPrimerPago: 30, // el primer pago no puede quedar más allá de estos días desde hoy
  maxCuotasDerivados: 6, // referencia para propuestas >60 días (las decide el gestor)
  // Tramos por días de atraso (hasta = límite superior incluido)
  tramos: [
    { hasta: 15, maxCuotas: 2, inicialPct: 0 },
    { hasta: 30, maxCuotas: 3, inicialPct: 0, inicialPctScoreBajo: 0.1 },
    { hasta: 60, maxCuotas: 4, inicialPct: 0.2 },
  ],
  derivado: { inicialPct: 0.3 }, // > 60 días
  // El nivel desbloquea beneficios (no aplica a casos derivados)
  beneficiosNivel: {
    Bronce: { cuotasExtra: 0, inicialMenosPct: 0 },
    Plata: { cuotasExtra: 0, inicialMenosPct: 0 },
    Oro: { cuotasExtra: 1, inicialMenosPct: 0.05 },
  } as Record<Nivel, { cuotasExtra: number; inicialMenosPct: number }>,
};

export function interesMoratorio(montoCuota: number, diasAtraso: number, tea: number): number {
  if (diasAtraso <= 0) return 0;
  const tasaDiaria = (tea * FACTOR_MORATORIO) / 360;
  return Math.round(montoCuota * tasaDiaria * diasAtraso * 100) / 100;
}

// ---------------------------------------------------------------- tipos

export interface CreditoReglas {
  diasAtraso: number;
  montoVencido: number; // suma de cuotas vencidas
  interesMoratorio: number; // a la fecha
  reprogramacionActiva: boolean;
}
export interface ClienteReglas { score: number }
export interface PropuestaPlan { nCuotas: number; inicial: number; fechaPrimerPago: string }

export interface Limites {
  deuda: number;
  derivado: boolean;
  maxCuotas: number;
  inicialMinPct: number;
  inicialMin: number;
  primerPagoMin: string;
  primerPagoMax: string;
  nivel: Nivel;
}

export interface Validacion {
  aceptable: boolean; // cumple las reglas de aprobación automática
  resultado: "automatica" | "derivada" | "no_cumple" | "no_disponible";
  motivos: string[];
  contrapropuesta: PropuestaPlan | null; // la alternativa más cercana que sí cumple
  limites: Limites;
  cronograma: Cronograma;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => "S/ " + n.toFixed(2);

// ---------------------------------------------------------------- límites

export function limitesPara(credito: CreditoReglas, cliente: ClienteReglas, hoy: string): Limites {
  const deuda = r2(credito.montoVencido + credito.interesMoratorio);
  const nivel = nivelDe(cliente.score);
  const base = { deuda, nivel, primerPagoMin: hoy, primerPagoMax: sumarDias(hoy, REGLAS.maxDiasPrimerPago) };

  if (credito.diasAtraso > REGLAS.tramos[REGLAS.tramos.length - 1].hasta) {
    const pct = REGLAS.derivado.inicialPct;
    return { ...base, derivado: true, maxCuotas: REGLAS.maxCuotasDerivados, inicialMinPct: pct, inicialMin: Math.min(deuda, Math.ceil(deuda * pct * 100) / 100) };
  }
  const t = REGLAS.tramos.find((x) => credito.diasAtraso <= x.hasta)!;
  let pct = t.inicialPct;
  if ("inicialPctScoreBajo" in t && t.inicialPctScoreBajo !== undefined && cliente.score < REGLAS.scoreBuenHistorial) pct = t.inicialPctScoreBajo;
  const ben = REGLAS.beneficiosNivel[nivel];
  pct = Math.max(0, r2(pct - ben.inicialMenosPct));
  return { ...base, derivado: false, maxCuotas: t.maxCuotas + ben.cuotasExtra, inicialMinPct: pct, inicialMin: Math.min(deuda, Math.ceil(deuda * pct * 100) / 100) };
}

// ---------------------------------------------------------------- validación

export function validarPropuesta(credito: CreditoReglas, cliente: ClienteReglas, propuesta: PropuestaPlan, hoy: string): Validacion {
  const lim = limitesPara(credito, cliente, hoy);
  const cron = (p: PropuestaPlan) => generarCronograma({ deuda: lim.deuda, inicial: p.inicial, nCuotas: p.nCuotas, fechaPrimerPago: p.fechaPrimerPago, hoy });

  if (credito.reprogramacionActiva) {
    return { aceptable: false, resultado: "no_disponible", contrapropuesta: null, limites: lim, cronograma: cron(propuesta),
      motivos: ["Este crédito ya tiene una reprogramación activa. Solo se permite una a la vez."] };
  }
  if (credito.diasAtraso <= 0 || lim.deuda <= 0) {
    return { aceptable: false, resultado: "no_disponible", contrapropuesta: null, limites: lim, cronograma: cron(propuesta),
      motivos: ["Usted no tiene cuotas vencidas por reprogramar. ¡Está al día!"] };
  }

  const motivos: string[] = [];
  const n = Math.round(propuesta.nCuotas);
  const inicial = r2(propuesta.inicial);
  const fecha = propuesta.fechaPrimerPago;

  if (n < 1) motivos.push("Debe elegir al menos 1 cuota.");
  if (n > lim.maxCuotas) motivos.push(`Para su situación el máximo es ${lim.maxCuotas} cuota${lim.maxCuotas === 1 ? "" : "s"}.`);
  if (inicial < 0) motivos.push("La inicial no puede ser negativa.");
  if (inicial > lim.deuda) motivos.push(`La inicial no puede superar su deuda de ${fmt(lim.deuda)}.`);
  if (inicial < lim.inicialMin) {
    motivos.push(lim.inicialMin > 0
      ? `Se necesita una inicial de al menos ${fmt(lim.inicialMin)} (${Math.round(lim.inicialMinPct * 100)}% de su deuda).`
      : "Inicial insuficiente.");
  }
  if (diferenciaDias(hoy, fecha) < 0) motivos.push("El primer pago no puede ser en una fecha pasada.");
  if (diferenciaDias(hoy, fecha) > REGLAS.maxDiasPrimerPago) motivos.push(`El primer pago debe ser dentro de los próximos ${REGLAS.maxDiasPrimerPago} días.`);
  const financiado = r2(lim.deuda - Math.min(Math.max(inicial, 0), lim.deuda));
  if (financiado > 0 && n >= 1 && r2(financiado / n) < REGLAS.cuotaMinima) {
    motivos.push(`Cada cuota debe ser de al menos ${fmt(REGLAS.cuotaMinima)}.`);
  }

  const contrapropuesta = motivos.length ? mejorAlternativa(lim, propuesta, hoy) : null;
  const cumple = motivos.length === 0;
  const resultado = !cumple ? "no_cumple" : lim.derivado ? "derivada" : "automatica";
  return { aceptable: cumple && !lim.derivado, resultado, motivos, contrapropuesta, limites: lim, cronograma: cron(propuesta) };
}

/** Alternativa más cercana a lo que pidió el cliente que sí cumple todas las reglas. */
function mejorAlternativa(lim: Limites, p: PropuestaPlan, hoy: string): PropuestaPlan {
  let n = Math.min(Math.max(Math.round(p.nCuotas) || 1, 1), lim.maxCuotas);
  let inicial = Math.min(Math.max(r2(p.inicial) || 0, lim.inicialMin), lim.deuda);
  let fecha = p.fechaPrimerPago;
  if (!fecha || diferenciaDias(hoy, fecha) < 0) fecha = hoy;
  if (diferenciaDias(hoy, fecha) > REGLAS.maxDiasPrimerPago) fecha = sumarDias(hoy, REGLAS.maxDiasPrimerPago);

  const financiado = r2(lim.deuda - inicial);
  if (financiado > 0) {
    if (financiado < REGLAS.cuotaMinima) {
      inicial = lim.deuda; // saldo menor a una cuota mínima: se cancela con la inicial
    } else {
      n = Math.max(1, Math.min(n, Math.floor(financiado / REGLAS.cuotaMinima)));
    }
  }
  return { nCuotas: r2(lim.deuda - inicial) > 0 ? n : 0, inicial, fechaPrimerPago: fecha };
}
