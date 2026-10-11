import { idNumerico, leerJson, responder } from "@/lib/api";
import { accionFinanzas, finanzasCliente } from "@/lib/servicio";

export const dynamic = "force-dynamic";

/** Mis Finanzas del cliente: resumen del mes, crédito, consejos, ingresos y gastos. */
export async function GET(req: Request) {
  return responder(() => finanzasCliente(idNumerico(new URL(req.url).searchParams.get("clienteId"))));
}

/** Guardar o borrar ingresos y gastos, o crear una etiqueta propia. */
export async function POST(req: Request) {
  return responder(async () => {
    const b = await leerJson(req);
    return accionFinanzas(idNumerico(b.clienteId), b.accion, b.datos ?? {});
  });
}
