import { leerJson, responder } from "@/lib/api";
import { otorgarRescateMasivo, segmentosRescate } from "@/lib/servicio";

export const dynamic = "force-dynamic";

/** Rangos de puntos con la cantidad de clientes que pueden recibir el Modo Rescate. */
export async function GET() {
  return responder(() => ({ rangos: segmentosRescate() }));
}

/** Campaña masiva: activa el Modo Rescate a todos los elegibles del rango elegido. */
export async function POST(req: Request) {
  return responder(async () => otorgarRescateMasivo(String((await leerJson(req)).rango ?? ""), "gestor"));
}
