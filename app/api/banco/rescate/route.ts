import { leerJson, responder } from "@/lib/api";
import { otorgarRescateMasivo, vistaPreviaRescate } from "@/lib/servicio";

export const dynamic = "force-dynamic";

/** Vista previa: cuántos clientes con score igual o mayor a `min` pueden recibir el Modo Rescate. */
export async function GET(req: Request) {
  return responder(() => vistaPreviaRescate(new URL(req.url).searchParams.get("min") ?? 60));
}

/** Campaña masiva: activa el Modo Rescate a todos los elegibles con score igual o mayor al mínimo. */
export async function POST(req: Request) {
  return responder(async () => otorgarRescateMasivo((await leerJson(req)).min, "gestor"));
}
