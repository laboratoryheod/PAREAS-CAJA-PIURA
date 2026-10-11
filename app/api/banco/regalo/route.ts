import { idNumerico, leerJson, responder } from "@/lib/api";
import { otorgarRegalo } from "@/lib/servicio";

export const dynamic = "force-dynamic";

/** El gestor activa la campaña "Modo Rescate" para un cliente moroso. */
export async function POST(req: Request) {
  return responder(async () => otorgarRegalo(idNumerico((await leerJson(req)).clienteId), "gestor"));
}
