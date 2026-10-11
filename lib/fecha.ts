// Fecha "hoy" del sistema: fija y configurable (FECHA_SISTEMA) para que los días de atraso sean estables.
// Se puede mover con el botón "pasar un día" (se guarda en la tabla app_estado).
export const FECHA_INICIAL = process.env.FECHA_SISTEMA ?? "2026-10-10";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diferenciaDias(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta + "T12:00:00Z") - Date.parse(desde + "T12:00:00Z")) / 86400000);
}

/** Suma meses conservando el día cuando es posible (31 ene + 1 mes = 28/29 feb). */
export function sumarMeses(iso: string, meses: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = m - 1 + meses;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const ultimo = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
}

/** "15 de octubre" */
export function fechaLarga(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]}`;
}

export function soles(n: number): string {
  return "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
