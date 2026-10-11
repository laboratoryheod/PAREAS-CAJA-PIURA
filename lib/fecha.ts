// Fecha "hoy" del sistema: la fecha real de Perú (America/Lima). FECHA_SISTEMA la fija (pruebas automáticas).
// La herramienta "Pasar un día" suma días a esta fecha (desfase guardado en la tabla app_estado).
export const ZONA_HORARIA = "America/Lima";

/** Fecha de hoy en Perú, YYYY-MM-DD. */
export function hoyReal(): string {
  if (process.env.FECHA_SISTEMA) return process.env.FECHA_SISTEMA;
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

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
