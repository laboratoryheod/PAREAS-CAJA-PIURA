import { idNumerico, responder } from "@/lib/api";
import { detalleCliente } from "@/lib/servicio";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return responder(async () => detalleCliente(idNumerico((await params).id)));
}
