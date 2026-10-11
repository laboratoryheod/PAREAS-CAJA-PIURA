import { NextResponse } from "next/server";
import { responder } from "@/lib/api";
import { MOSTRAR_HERRAMIENTAS_PRUEBA } from "@/lib/config";
import { avanzarDia } from "@/lib/servicio";

export const dynamic = "force-dynamic";

/** Herramienta de prueba: avanza un día para ver el CHICOTAZO y las promesas vencidas. Con MOSTRAR_HERRAMIENTAS_PRUEBA = false la ruta no existe (404). */
export async function POST() {
  if (!MOSTRAR_HERRAMIENTAS_PRUEBA) return NextResponse.json({ error: "No disponible" }, { status: 404 });
  return responder(() => avanzarDia());
}
