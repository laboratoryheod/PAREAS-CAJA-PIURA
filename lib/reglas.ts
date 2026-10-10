// REGLAS DE NEGOCIO SIMULADAS — un solo archivo editable.
// (La función validarPropuesta se agrega en el paso 3.)

/** Tasa moratoria = TEA del crédito × este factor, prorrateada por día (interés simple). Simulado. */
export const FACTOR_MORATORIO = 1.5;

export function interesMoratorio(montoCuota: number, diasAtraso: number, tea: number): number {
  if (diasAtraso <= 0) return 0;
  const tasaDiaria = (tea * FACTOR_MORATORIO) / 360;
  return Math.round(montoCuota * tasaDiaria * diasAtraso * 100) / 100;
}
