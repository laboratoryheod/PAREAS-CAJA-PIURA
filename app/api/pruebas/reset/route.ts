import { responder } from "@/lib/api";
import { reiniciarApp } from "@/lib/servicio";

export const dynamic = "force-dynamic";

export async function POST() {
  return responder(() => reiniciarApp());
}
