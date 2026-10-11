import { NextResponse } from "next/server";
import { responder } from "@/lib/api";
import { excelCartera, leerExcelCartera, plantillaCartera } from "@/lib/excel-cartera";
import { ErrorNegocio, filasExportacion, importarCartera } from "@/lib/servicio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_BYTES = 5 * 1024 * 1024;

/** Descarga: ?tipo=plantilla (vacía con ejemplo) o ?tipo=cartera (cartera actual con su estado). */
export async function GET(req: Request) {
  const tipo = new URL(req.url).searchParams.get("tipo");
  try {
    const filas = tipo === "plantilla" ? [] : filasExportacion();
    const buf = tipo === "plantilla" ? await plantillaCartera() : await excelCartera(filas);
    const nombre = tipo === "plantilla" ? "plantilla-cartera-caja-piura.xlsx" : `cartera-caja-piura-${filas[0]?.fechaCorte ?? "hoy"}.xlsx`;
    return new NextResponse(new Uint8Array(buf), { headers: { "content-type": XLSX, "content-disposition": `attachment; filename="${nombre}"`, "cache-control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No se pudo generar el Excel." }, { status: 500 });
  }
}

/** Subida: agrega clientes nuevos y actualiza los existentes (por ID del sistema o DNI). */
export async function POST(req: Request) {
  return responder(async () => {
    const form = await req.formData().catch(() => null);
    const archivo = form?.get("archivo");
    if (!archivo || typeof archivo === "string") throw new ErrorNegocio("Adjunte un archivo Excel (.xlsx).");
    if (archivo.size > MAX_BYTES) throw new ErrorNegocio("El archivo pesa más de 5 MB.");
    let filas;
    try { filas = await leerExcelCartera(await archivo.arrayBuffer()); }
    catch (e: any) { throw new ErrorNegocio(e.message); }
    if (!filas.length) throw new ErrorNegocio("El Excel no tiene filas con datos.");
    return importarCartera(filas);
  });
}
