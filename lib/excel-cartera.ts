// Formato del Excel de cartera del gestor: plantilla para cargar clientes, lectura del archivo subido y
// descarga de la cartera con su estado al día. Las reglas de negocio están en lib/servicio.ts (importarCartera).
import ExcelJS from "exceljs";
import type { FilaImportacion, filasExportacion } from "./servicio";

type ClaveFila = Exclude<keyof FilaImportacion, "fila">;
type FilaExport = ReturnType<typeof filasExportacion>[number];

/** Columnas que se pueden importar (en cualquier orden; se reconocen por su título). */
export const COLUMNAS: { clave: ClaveFila; titulo: string; ancho: number; nota: string; tipo: "texto" | "numero" | "si_no" }[] = [
  { clave: "idSistema", titulo: "ID sistema", ancho: 11, nota: "Lo asigna el sistema. Déjelo vacío para clientes nuevos.", tipo: "numero" },
  { clave: "dni", titulo: "DNI", ancho: 12, nota: "8 dígitos. Obligatorio para clientes nuevos.", tipo: "texto" },
  { clave: "nombres", titulo: "Nombres y apellidos", ancho: 30, nota: "Obligatorio para clientes nuevos.", tipo: "texto" },
  { clave: "telefono", titulo: "Teléfono", ancho: 13, nota: "", tipo: "texto" },
  { clave: "zona", titulo: "Zona", ancho: 14, nota: "", tipo: "texto" },
  { clave: "negocio", titulo: "Negocio", ancho: 22, nota: "", tipo: "texto" },
  { clave: "tipoCredito", titulo: "Tipo de crédito", ancho: 20, nota: "Obligatorio para clientes nuevos.", tipo: "texto" },
  { clave: "montoDesembolsado", titulo: "Monto desembolsado (S/)", ancho: 16, nota: "", tipo: "numero" },
  { clave: "saldoCapital", titulo: "Saldo capital (S/)", ancho: 15, nota: "", tipo: "numero" },
  { clave: "tea", titulo: "TEA (%)", ancho: 9, nota: "Por ejemplo 38 para 38 %.", tipo: "numero" },
  { clave: "cuotaMensual", titulo: "Cuota mensual (S/)", ancho: 15, nota: "Obligatorio para clientes nuevos.", tipo: "numero" },
  { clave: "cuotasPendientes", titulo: "Cuotas pendientes", ancho: 12, nota: "", tipo: "numero" },
  { clave: "diasAtraso", titulo: "Días de atraso", ancho: 11, nota: "0 si está al día.", tipo: "numero" },
  { clave: "montoVencido", titulo: "Cuotas vencidas (S/)", ancho: 15, nota: "Capital vencido, sin mora.", tipo: "numero" },
  { clave: "yaPago", titulo: "¿Ya pagó?", ancho: 10, nota: "Escriba Sí solo si el cliente pagó todo lo vencido. Vacío no cambia nada.", tipo: "si_no" },
];

/** Columnas solo informativas de la descarga (se ignoran al volver a subir el archivo). */
const INFORMATIVAS: { clave: keyof FilaExport; titulo: string; ancho: number }[] = [
  { clave: "interesMoratorio", titulo: "Interés moratorio (S/)", ancho: 15 },
  { clave: "deudaHoy", titulo: "Deuda total hoy (S/)", ancho: 15 },
  { clave: "estado", titulo: "Estado", ancho: 20 },
  { clave: "score", titulo: "Score", ancho: 8 },
  { clave: "nivel", titulo: "Nivel", ancho: 9 },
  { clave: "modoRescate", titulo: "Modo Rescate", ancho: 12 },
  { clave: "fechaCorte", titulo: "Fecha de corte", ancho: 13 },
];

const AZUL = "FF0047AB", GRIS = "FF5A5F6A";
const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

function hoja(wb: ExcelJS.Workbook, nombre: string, cols: { titulo: string; ancho: number; informativa?: boolean }[]) {
  const ws = wb.addWorksheet(nombre, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = cols.map((c) => ({ header: c.titulo, width: c.ancho }));
  const fila = ws.getRow(1);
  fila.height = 30;
  cols.forEach((c, i) => {
    const celda = fila.getCell(i + 1);
    celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.informativa ? GRIS : AZUL } };
    celda.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  return ws;
}

function instrucciones(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("Instrucciones");
  ws.columns = [{ width: 26 }, { width: 70 }];
  ws.addRow(["Cartera de PAREAS · Caja Piura"]).font = { bold: true, size: 14, color: { argb: AZUL } };
  ws.addRow([]);
  ws.addRow(["Cómo funciona", "Suba este archivo en Panel del gestor › Cartera › Subir Excel. Los clientes con el mismo ID sistema o DNI se actualizan; los demás se agregan. Nunca se borra a nadie."]);
  ws.addRow(["Clientes que ya pagaron", "Escriba Sí en la columna ¿Ya pagó?: se cancela lo vencido y el cliente queda al día."]);
  ws.addRow(["Columnas grises", "Son informativas (estado, deuda, score). Se ignoran al subir el archivo."]);
  ws.addRow([]);
  ws.addRow(["Columna", "Detalle"]).font = { bold: true };
  for (const c of COLUMNAS) ws.addRow([c.titulo, c.nota || "Opcional."]);
  ws.getColumn(2).alignment = { wrapText: true, vertical: "top" };
}

/** Plantilla vacía con un ejemplo, para cargar clientes nuevos. */
export async function plantillaCartera(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Caja Piura";
  const ws = hoja(wb, "Cartera", COLUMNAS);
  ws.addRow(["", "45871236", "Rosa Atoche Navarro", "987654321", "Castilla", "Bodega", "Mype comercio", 4800, 3200, 38, 320, 10, 15, 320, "No"]);
  instrucciones(wb);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Cartera actual con su estado, lista para editar (por ejemplo, marcar quién ya pagó) y volver a subir. */
export async function excelCartera(filas: FilaExport[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Caja Piura";
  const ws = hoja(wb, "Cartera", [...COLUMNAS, ...INFORMATIVAS.map((c) => ({ ...c, informativa: true }))]);
  for (const f of filas) ws.addRow([...COLUMNAS.map((c) => f[c.clave as keyof FilaExport] ?? ""), ...INFORMATIVAS.map((c) => f[c.clave] ?? "")]);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNAS.length + INFORMATIVAS.length } };
  instrucciones(wb);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function valorCelda(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("result" in v) return valorCelda(v.result as ExcelJS.CellValue);
    if ("text" in v) return String(v.text);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v).trim();
}

/** "S/ 1,234.50" → 1234.5 · "150,5" → 150.5 */
function numero(t: string): number {
  let x = t.replace(/[^\d.,-]/g, "");
  if (x.includes(",") && x.includes(".")) x = x.replace(/,/g, "");
  else x = x.replace(",", ".");
  return x === "" ? NaN : Number(x);
}

/** Lee el Excel subido (primera hoja o la hoja "Cartera") y devuelve sus filas con nombres de campo. */
export async function leerExcelCartera(archivo: ArrayBuffer): Promise<FilaImportacion[]> {
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(archivo); } catch { throw new Error("El archivo no es un Excel válido (.xlsx)."); }
  const ws = wb.getWorksheet("Cartera") ?? wb.worksheets[0];
  if (!ws) throw new Error("El Excel no tiene hojas.");
  const porTitulo = new Map(COLUMNAS.map((c) => [norm(c.titulo), c]));
  const indice = new Map<number, (typeof COLUMNAS)[number]>();
  ws.getRow(1).eachCell((celda, col) => { const c = porTitulo.get(norm(valorCelda(celda.value))); if (c) indice.set(col, c); });
  if (![...indice.values()].some((c) => c.clave === "dni" || c.clave === "idSistema")) throw new Error("No encontramos las columnas DNI o ID sistema. Use la plantilla de Caja Piura.");

  const filas: FilaImportacion[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const f: FilaImportacion = { fila: n };
    let vacia = true;
    for (const [col, c] of indice) {
      const t = valorCelda(row.getCell(col).value);
      if (!t) continue;
      vacia = false;
      if (c.tipo === "numero") (f as any)[c.clave] = numero(t);
      else if (c.clave === "dni") f.dni = /^\d{5,7}$/.test(t) ? t.padStart(8, "0") : t.replace(/\s/g, ""); // Excel quita los ceros iniciales
      else if (c.tipo === "si_no") f.yaPago = /^(si|sí|s|yes|1|x|pagado|pago)$/i.test(t);
      else (f as any)[c.clave] = t;
    }
    if (!vacia) filas.push(f);
  });
  if (filas.length > 5000) throw new Error("El archivo tiene más de 5000 filas. Divídalo en partes.");
  return filas;
}
