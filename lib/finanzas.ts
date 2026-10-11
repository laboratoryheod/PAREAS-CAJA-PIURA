// MIS FINANZAS — modelos y cálculos puros de la calculadora de ingresos y gastos.
// Se ejecutan solo en el servidor (lib/servicio.ts → finanzasCliente); el navegador únicamente muestra.

export type Frecuencia = "unico" | "semanal" | "quincenal" | "mensual";
export type TipoGasto = "fijo" | "variable";
export type Ambito = "personal" | "negocio";
export type Semaforo = "verde" | "amarillo" | "rojo" | "sin_datos";

/** `fecha`: día en que se registró (un ingreso "una sola vez" solo cuenta en ese mes). */
export interface Ingreso { id: number; nombre: string; monto: number; frecuencia: Frecuencia; fecha: string }
export interface Gasto { id: number; nombre: string; monto: number; categoria: string; fecha: string; tipo: TipoGasto; ambito: Ambito }
export interface Categoria { id: string; nombre: string; color: string; icono: IconoCategoria; propia: boolean }

/**
 * Lo que el cliente debe destinar a su crédito (PUNTO DE INTEGRACIÓN: hoy lo arma `cuotaParaFinanzas` en
 * lib/servicio.ts con los datos del crédito; al conectar la calculadora de mora del core basta con llenar esta forma).
 */
export interface CuotaCredito {
  proxima: { monto: number; fecha: string; diasFaltan: number; concepto: "cuota" | "plan" } | null;
  /** Deuda vencida a pagar ya (o el monto del Modo Rescate, si tiene uno vigente). */
  vencido: number;
  conRescate: boolean;
}

export interface ResumenMensual {
  mes: string; // YYYY-MM
  ingresos: number;
  gastos: number;
  cuota: number;
  vencido: number;
  sobra: number;
  /** Lo que sobra como porcentaje del ingreso (1 decimal). */
  pctSobra: number;
  semaforo: Semaforo;
  /** El dinero no alcanza para cubrir el crédito este mes. */
  noAlcanza: boolean;
  porCategoria: { categoria: string; total: number; pctIngreso: number; pctGastos: number }[];
  porAmbito: Record<Ambito, number>;
}

export type IconoCategoria = "canasta" | "casa" | "bus" | "salud" | "libro" | "tienda" | "tarjeta" | "etiqueta" | "estrella" | "corazon";

export const CATEGORIAS_BASE: Categoria[] = [
  { id: "alimentacion", nombre: "Alimentación", color: "#1DA851", icono: "canasta", propia: false },
  { id: "vivienda", nombre: "Vivienda y servicios", color: "#0072C6", icono: "casa", propia: false },
  { id: "transporte", nombre: "Transporte", color: "#E89B00", icono: "bus", propia: false },
  { id: "salud", nombre: "Salud", color: "#C9182B", icono: "salud", propia: false },
  { id: "educacion", nombre: "Educación", color: "#7B2FF7", icono: "libro", propia: false },
  { id: "negocio", nombre: "Negocio", color: "#00347A", icono: "tienda", propia: false },
  { id: "deudas", nombre: "Deudas y otros créditos", color: "#5A5F6A", icono: "tarjeta", propia: false },
  { id: "otros", nombre: "Otros", color: "#0FA5A0", icono: "etiqueta", propia: false },
];
export const COLORES_ETIQUETA = ["#D6247A", "#FF7A59", "#0FA5A0", "#2F8CFF", "#7B2FF7", "#1DA851"];
export const ICONOS_ETIQUETA: IconoCategoria[] = ["estrella", "corazon", "etiqueta", "canasta", "tienda", "casa"];

export const FRECUENCIAS: Record<Frecuencia, { nombre: string; porMes: number }> = {
  unico: { nombre: "Una sola vez", porMes: 1 },
  semanal: { nombre: "Cada semana", porMes: 52 / 12 },
  quincenal: { nombre: "Cada quincena", porMes: 2 },
  mensual: { nombre: "Cada mes", porMes: 1 },
};

/** Umbrales del semáforo (porcentaje del ingreso que sobra). */
export const SEMAFORO = { verdeDesde: 20, amarilloDesde: 5 };

export const r2 = (n: number) => Math.round(n * 100) / 100;
const mesDe = (fecha: string) => fecha.slice(0, 7);

/** Ingreso llevado a su equivalente mensual (semanal × 52/12, quincenal × 2…). */
export function ingresoMensual(i: Pick<Ingreso, "monto" | "frecuencia">): number {
  return r2(i.monto * FRECUENCIAS[i.frecuencia].porMes);
}

/** Los ingresos que se repiten cuentan desde el mes en que se registraron; "una sola vez", solo en ese mes. */
export function ingresoEnMes(i: Pick<Ingreso, "frecuencia" | "fecha">, mes: string): boolean {
  const desde = (i.fecha ?? "").slice(0, 7);
  return i.frecuencia === "unico" ? desde === mes : !desde || desde <= mes;
}

/**
 * ¿El gasto cuenta en el mes? Los gastos variables cuentan solo en su mes; los fijos (luz, alquiler, colegio)
 * se repiten cada mes desde su fecha.
 */
export function gastoEnMes(g: Pick<Gasto, "fecha" | "tipo">, mes: string): boolean {
  return g.tipo === "fijo" ? mesDe(g.fecha) <= mes : mesDe(g.fecha) === mes;
}

export function semaforoDe(ingresos: number, sobra: number): Semaforo {
  if (ingresos <= 0) return "sin_datos";
  const pct = (sobra / ingresos) * 100;
  return pct > SEMAFORO.verdeDesde ? "verde" : pct >= SEMAFORO.amarilloDesde ? "amarillo" : "rojo";
}

/** Ingresos totales − gastos totales − cuota del crédito (− deuda vencida) = lo que sobra. */
export function resumenMensual(p: { ingresos: Ingreso[]; gastos: Gasto[]; credito: CuotaCredito; hoy: string }): ResumenMensual {
  const mes = mesDe(p.hoy);
  const ingresos = r2(p.ingresos.filter((i) => ingresoEnMes(i, mes)).reduce((s, i) => s + ingresoMensual(i), 0));
  const delMes = p.gastos.filter((g) => gastoEnMes(g, mes));
  const gastos = r2(delMes.reduce((s, g) => s + g.monto, 0));
  const cuota = r2(p.credito.proxima?.monto ?? 0);
  const vencido = r2(p.credito.vencido);
  const sobra = r2(ingresos - gastos - cuota - vencido);

  const totales = new Map<string, number>();
  for (const g of delMes) totales.set(g.categoria, r2((totales.get(g.categoria) ?? 0) + g.monto));
  const porCategoria = [...totales.entries()]
    .map(([categoria, total]) => ({ categoria, total, pctIngreso: ingresos ? r2((total / ingresos) * 100) : 0, pctGastos: gastos ? r2((total / gastos) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);

  return {
    mes, ingresos, gastos, cuota, vencido, sobra,
    pctSobra: ingresos ? Math.round((sobra / ingresos) * 1000) / 10 : 0,
    semaforo: semaforoDe(ingresos, sobra),
    noAlcanza: ingresos > 0 && sobra < 0,
    porCategoria,
    porAmbito: {
      personal: r2(delMes.filter((g) => g.ambito === "personal").reduce((s, g) => s + g.monto, 0)),
      negocio: r2(delMes.filter((g) => g.ambito === "negocio").reduce((s, g) => s + g.monto, 0)),
    },
  };
}

// ---------------------------------------------------------------- validaciones (mensajes amables)

export class DatoInvalido extends Error {}

/** Lee montos como los escribe la gente: "150", "150.5", "150,50", "1,234.50", "1.234,50", "S/ 1 234". */
export function numeroEscrito(t: string): number {
  let s = t.replace(/s\/|\s/gi, "");
  if (!/^-?[\d.,]+$/.test(s)) return NaN;
  const ultimoPunto = s.lastIndexOf("."), ultimaComa = s.lastIndexOf(",");
  const sep = Math.max(ultimoPunto, ultimaComa);
  // El último separador es decimal si le siguen 1 o 2 dígitos; si le siguen 3, es de miles ("1,234" = 1234)
  const dosSeparadores = ultimoPunto >= 0 && ultimaComa >= 0;
  if (sep >= 0 && s.length - sep - 1 <= 2) s = s.slice(0, sep).replace(/[.,]/g, "") + "." + s.slice(sep + 1);
  // Tres dígitos tras el separador: es de miles con coma ("1,234") o si hay dos separadores ("1.234,000").
  // "12.345" con un solo punto es ambiguo con dinero: se deja así y la validación pide como máximo 2 decimales.
  else if (sep >= 0 && s.length - sep - 1 === 3 && (sep === ultimaComa || dosSeparadores)) s = s.replace(/[.,]/g, "");
  return s === "" || s === "-" ? NaN : Number(s);
}

export function validarMonto(v: unknown): number {
  const n = typeof v === "string" ? numeroEscrito(v) : Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new DatoInvalido("Escriba un monto mayor a cero, por ejemplo 150.50.");
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) throw new DatoInvalido("El monto puede tener como máximo 2 decimales, por ejemplo 150.50.");
  if (n > 1_000_000) throw new DatoInvalido("El monto es muy alto. Revise que no tenga ceros de más.");
  return r2(n);
}

export function validarNombre(v: unknown, que = "el gasto"): string {
  const s = String(v ?? "").trim().replace(/\s+/g, " ");
  if (!s) throw new DatoInvalido(`Escriba un nombre para ${que}, por ejemplo "Mercado".`);
  if (s.length > 40) throw new DatoInvalido("El nombre es muy largo. Use 40 letras como máximo.");
  return s;
}

/** Fecha real del calendario (sin "30 de febrero"), no posterior a `hoy` y de los últimos 12 meses. */
export function validarFecha(v: unknown, hoy?: string): string {
  const s = String(v ?? "");
  const d = new Date(s + "T12:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new DatoInvalido("Elija una fecha válida.");
  if (hoy && s > hoy) throw new DatoInvalido("La fecha no puede ser posterior a hoy. Registre el gasto el día que lo haga.");
  if (hoy && s < `${Number(hoy.slice(0, 4)) - 1}${hoy.slice(4)}`) throw new DatoInvalido("La fecha es muy antigua. Use una fecha de los últimos 12 meses.");
  return s;
}
