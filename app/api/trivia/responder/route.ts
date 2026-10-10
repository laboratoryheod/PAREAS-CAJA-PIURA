import { idNumerico, leerJson, responder } from "@/lib/api";
import { responderTrivia } from "@/lib/servicio";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return responder(async () => {
    const b = await leerJson(req);
    return responderTrivia(idNumerico(b.clienteId), idNumerico(b.preguntaId), Number(b.opcion));
  });
}
