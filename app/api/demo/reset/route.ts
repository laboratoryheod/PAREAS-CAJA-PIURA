import { responder } from "@/lib/api";
import { resetearDemo } from "@/lib/servicio";

export const dynamic = "force-dynamic";

export async function POST() {
  return responder(() => resetearDemo());
}
