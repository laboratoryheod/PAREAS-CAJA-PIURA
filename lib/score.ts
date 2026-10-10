// MOTOR DE SCORE CON EL PACASO — puntaje único 0–100.
// Todos los valores se ajustan en PARAMS_SCORE.
import { nivelDe, UMBRALES_NIVEL, type Nivel } from "./niveles";
import { REGLAS } from "./reglas";
import { APELATIVO } from "./config";

export const PARAMS_SCORE = {
  inicial: 70,
  min: 0,
  max: 100,
  // Suma
  triviaCorrecta: 2,
  topeTriviaDia: 10,
  preguntasPorDia: 5, // completar el set diario = racha del día
  racha: 5, // NO se otorga mientras el cliente está en mora (ver nota abajo)
  pagoPuntual: 15,
  promesaCumplida: 20,
  // Resta (chicotazo de Pareas)
  chicotazoPorDia: -12, // por cada día que el cliente sigue en mora; supera a propósito el tope de trivia (+10)
  // Incumplir un plan NO resta puntos fijos: vuelve el chicotazo diario y el cliente pierde sus beneficios
  // (ver REGLAS en lib/reglas.ts) hasta que la Caja le ofrezca un "regalo salvador".
} as const;
// Nota: con trivia (+10 máx.) y sin racha en mora, el neto diario en mora es 10 − 12 = −2, siempre negativo.
// Pareas solo deja de pegar cuando el cliente paga.

export type TipoMovimiento = "trivia" | "racha" | "pago_puntual" | "promesa_cumplida" | "chicotazo_mora" | "promesa_incumplida";

export interface Movimiento { tipo: TipoMovimiento; puntos: number; fecha: string; detalle?: string }

export interface ResultadoScore {
  score: number;
  nivel: Nivel;
  /** Puntos efectivamente aplicados por movimiento (tras topes diarios y cota [0,100]) y saldo resultante. */
  detalle: { puntosAplicados: number; saldo: number }[];
}

const acotar = (n: number) => Math.max(PARAMS_SCORE.min, Math.min(PARAMS_SCORE.max, n));

/** Puntos de trivia aún permitidos hoy, dado lo ganado por trivia ese día. */
export function triviaPermitida(puntosTriviaHoy: number, solicitados: number = PARAMS_SCORE.triviaCorrecta): number {
  return Math.max(0, Math.min(solicitados, PARAMS_SCORE.topeTriviaDia - puntosTriviaHoy));
}

/** Recorre los movimientos en orden, aplica el tope diario de trivia y acota en [0,100] paso a paso. */
export function calcularScore(movimientos: Movimiento[]): ResultadoScore {
  let score: number = PARAMS_SCORE.inicial;
  const triviaPorDia = new Map<string, number>();
  const detalle: ResultadoScore["detalle"] = [];
  for (const m of movimientos) {
    let puntos = m.puntos;
    if (m.tipo === "trivia") {
      const previo = triviaPorDia.get(m.fecha) ?? 0;
      puntos = triviaPermitida(previo, puntos);
      triviaPorDia.set(m.fecha, previo + puntos);
    }
    const nuevo = acotar(score + puntos);
    detalle.push({ puntosAplicados: nuevo - score, saldo: nuevo });
    score = nuevo;
  }
  return { score, nivel: nivelDe(score), detalle };
}

/** Acceso a datos que necesita el motor (lo implementa el repositorio). */
export interface ScoreStore {
  movimientos(clienteId: number): Movimiento[];
  actualizarScore(clienteId: number, score: number, nivel: Nivel): void;
}

export function recalcularScore(store: ScoreStore, clienteId: number): ResultadoScore {
  const r = calcularScore(store.movimientos(clienteId));
  store.actualizarScore(clienteId, r.score, r.nivel);
  return r;
}

// ------------------------------------------------------------ reglas del día

/** Puntos que Pareas quita hoy por seguir en mora (0 si está al día). */
export function chicotazoDelDia(diasAtraso: number): number {
  return diasAtraso > 0 ? PARAMS_SCORE.chicotazoPorDia : 0;
}

/** La racha solo suma si el cliente está al día. */
export function rachaPermitida(diasAtraso: number): number {
  return diasAtraso > 0 ? 0 : PARAMS_SCORE.racha;
}

/** Neto diario esperable: trivia (con tope) + racha (si completó y está al día) + chicotazo. */
export function netoDiario(p: { diasAtraso: number; aciertos: number; completoRacha: boolean }): number {
  const trivia = Math.min(p.aciertos * PARAMS_SCORE.triviaCorrecta, PARAMS_SCORE.topeTriviaDia);
  const racha = p.completoRacha ? rachaPermitida(p.diasAtraso) : 0;
  return trivia + racha + chicotazoDelDia(p.diasAtraso);
}

// ------------------------------------------------------------ nivel y Pareas

export function puntosParaSiguienteNivel(score: number): { siguiente: Nivel | null; faltan: number } {
  if (score >= UMBRALES_NIVEL.oro) return { siguiente: null, faltan: 0 };
  if (score >= UMBRALES_NIVEL.plata) return { siguiente: "Oro", faltan: UMBRALES_NIVEL.oro - score };
  return { siguiente: "Plata", faltan: UMBRALES_NIVEL.plata - score };
}

export function beneficiosDeNivel(nivel: Nivel, sinBeneficios = false): string {
  if (sinBeneficios) return "Por no cumplir tu plan anterior, tus beneficios están en pausa hasta que te regularices con una campaña de la Caja.";
  const b = REGLAS.beneficiosNivel[nivel];
  const partes: string[] = [];
  if (b.cuotasExtra) partes.push(`${b.cuotasExtra} cuota extra para reprogramar`);
  if (b.inicialMenosPct) partes.push(`${Math.round(b.inicialMenosPct * 100)}% menos de inicial`);
  return partes.length ? `Beneficios de nivel ${nivel}: ${partes.join(" y ")}. ¡Chévere!` : `Sube de nivel para desbloquear más cuotas y menos inicial.`;
}

export type HumorPareas = "feliz" | "serio" | "chicotazo";

export function estadoPareas(c: { nombre?: string; diasAtraso: number; score: number; sinBeneficios?: boolean; regaloDisponible?: boolean }): { humor: HumorPareas; mensaje: string } {
  const quien = c.nombre ?? APELATIVO;
  if (c.regaloDisponible) {
    return { humor: "feliz", mensaje: `¡Oe ${quien}, te salió el Regalo Salvador! La Caja te da una mano para ponerte al día. Aprovéchalo antes de que venza, ${APELATIVO}.` };
  }
  if (c.diasAtraso > 0 && c.sinBeneficios) {
    return { humor: "chicotazo", mensaje: `¡CHICOTAZO doble! ${quien}, se pasó un pago de tu plan y tus beneficios quedaron en pausa. Tranqui, ${APELATIVO}: paga lo pendiente y Pareas deja de pegar.` };
  }
  if (c.diasAtraso > 0) {
    return { humor: "chicotazo", mensaje: `¡CHICOTAZO! Oe ${quien}, Pareas te recuerda que tienes una cuota pendiente. Mientras siga pendiente, tus puntos bajan; apenas pagues, vuelven a subir. ¡Tú puedes, ${APELATIVO}!` };
  }
  if (c.score < UMBRALES_NIVEL.plata) {
    return { humor: "serio", mensaje: `Pareas te tiene el ojo encima, ${quien}. Vas al día, ¡chévere! Suma puntos con la trivia para subir de nivel.` };
  }
  return { humor: "feliz", mensaje: `¡Chévere, ${quien}! Estás al día con tus pagos y Pareas está feliz. ¡Sigue así, ${APELATIVO}!` };
}
