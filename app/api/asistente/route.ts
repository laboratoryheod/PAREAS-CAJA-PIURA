import { idNumerico, leerJson, responder } from "@/lib/api";
import { conversar } from "@/lib/asistente";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return responder(async () => {
    const b = await leerJson(req);
    const historial = Array.isArray(b.historial) ? b.historial.filter((t: any) => t && typeof t.texto === "string" && (t.rol === "usuario" || t.rol === "asistente")) : [];
    return conversar(idNumerico(b.clienteId), typeof b.mensaje === "string" ? b.mensaje : "", historial);
  });
}
