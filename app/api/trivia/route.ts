import { idNumerico, responder } from "@/lib/api";
import { triviaSiguiente } from "@/lib/servicio";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return responder(() => triviaSiguiente(idNumerico(new URL(req.url).searchParams.get("clienteId"))));
}
