import { idNumerico, leerJson, responder } from "@/lib/api";
import { pedirAyudaHumana } from "@/lib/servicio";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return responder(async () => {
    const b = await leerJson(req);
    return pedirAyudaHumana(idNumerico(b.clienteId), typeof b.nota === "string" ? b.nota : undefined);
  });
}
