import { responder } from "@/lib/api";
import { derivados } from "@/lib/servicio";

export const dynamic = "force-dynamic";

export async function GET() {
  return responder(() => derivados());
}
