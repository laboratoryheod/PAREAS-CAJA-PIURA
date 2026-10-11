import { responder } from "@/lib/api";
import { avanzarDia } from "@/lib/servicio";

export const dynamic = "force-dynamic";

/** Herramienta de prueba: avanza un día para ver el CHICOTAZO y las promesas vencidas. */
export async function POST() {
  return responder(() => avanzarDia());
}
