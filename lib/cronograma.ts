import { sumarMeses } from "./fecha";

export interface PagoCronograma { n: number; fecha: string; monto: number; tipo: "inicial" | "cuota" }
export interface Cronograma { pagos: PagoCronograma[]; total: number; cuota: number }

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Cronograma de la reprogramación: inicial hoy (si hay) + cuotas mensuales iguales.
 * Sin interés adicional: se financia la deuda vencida + moratorio a la fecha. La última cuota absorbe el redondeo.
 */
export function generarCronograma(p: { deuda: number; inicial: number; nCuotas: number; fechaPrimerPago: string; hoy: string }): Cronograma {
  const inicial = r2(Math.min(Math.max(p.inicial, 0), p.deuda));
  const financiado = r2(p.deuda - inicial);
  const pagos: PagoCronograma[] = [];
  if (inicial > 0) pagos.push({ n: 0, fecha: p.hoy, monto: inicial, tipo: "inicial" });
  let cuota = 0;
  if (financiado > 0 && p.nCuotas > 0) {
    cuota = r2(financiado / p.nCuotas);
    let acumulado = 0;
    for (let i = 1; i <= p.nCuotas; i++) {
      const monto = i === p.nCuotas ? r2(financiado - acumulado) : cuota;
      acumulado = r2(acumulado + monto);
      pagos.push({ n: i, fecha: sumarMeses(p.fechaPrimerPago, i - 1), monto, tipo: "cuota" });
    }
  }
  return { pagos, total: r2(pagos.reduce((s, x) => s + x.monto, 0)), cuota };
}
