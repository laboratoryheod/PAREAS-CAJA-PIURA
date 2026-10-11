import { idNumerico, leerJson, responder } from "@/lib/api";
import { cobroPendiente, registrarPago } from "@/lib/servicio";

export const dynamic = "force-dynamic";

/** Qué se va a pagar y su QR (para compartir con un familiar). No registra nada. */
export async function GET(req: Request) {
  return responder(() => cobroPendiente(idNumerico(new URL(req.url).searchParams.get("clienteId"))));
}

export async function POST(req: Request) {
  return responder(async () => {
    const b = await leerJson(req);
    return registrarPago(idNumerico(b.clienteId), typeof b.concepto === "string" ? b.concepto : undefined);
  });
}
