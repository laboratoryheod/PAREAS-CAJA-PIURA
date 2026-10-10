import { leerJson, responder } from "@/lib/api";
import { simular } from "@/lib/servicio";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return responder(async () => simular(await leerJson(req) as any));
}
