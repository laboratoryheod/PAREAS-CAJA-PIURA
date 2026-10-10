import { responder } from "@/lib/api";
import { feed } from "@/lib/servicio";

export const dynamic = "force-dynamic";

/** Polling cada ~3 s: ?desde=<ultimoId> devuelve solo lo nuevo. */
export async function GET(req: Request) {
  return responder(() => feed(Number(new URL(req.url).searchParams.get("desde")) || 0));
}
