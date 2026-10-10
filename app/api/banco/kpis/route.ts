import { responder } from "@/lib/api";
import { kpis } from "@/lib/servicio";

export const dynamic = "force-dynamic";

export async function GET() {
  return responder(() => kpis());
}
