import { responder } from "@/lib/api";
import { resumenBanco } from "@/lib/servicio";

export const dynamic = "force-dynamic";

/** KPIs + casos derivados en una sola respuesta (una sola pasada por la cartera). */
export async function GET() {
  return responder(() => resumenBanco());
}
