import { responder } from "@/lib/api";
import { avanzarDia } from "@/lib/servicio";

export const dynamic = "force-dynamic";

/** Solo demo: avanza un día para ver el chicotazo del Pacaso y las promesas vencidas. */
export async function POST() {
  return responder(() => avanzarDia());
}
