import { idNumerico, responder } from "@/lib/api";
import { notificacionesCliente } from "@/lib/servicio";

export const dynamic = "force-dynamic";

/** Notificaciones del cliente (Modo Rescate, pago cercano, CHICOTAZO y trivia pendiente). */
export async function GET(req: Request) {
  return responder(() => ({ items: notificacionesCliente(idNumerico(new URL(req.url).searchParams.get("clienteId"))) }));
}
