import { responder, idNumerico } from "@/lib/api";
import { registrarEventoCliente, situacion } from "@/lib/servicio";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return responder(async () => {
    const id = idNumerico((await params).id);
    if (new URL(req.url).searchParams.get("abrir") === "1") registrarEventoCliente(id, "modulo_abierto");
    return situacion(id);
  });
}
