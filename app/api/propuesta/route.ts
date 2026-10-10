import { leerJson, responder } from "@/lib/api";
import { registrarPropuesta } from "@/lib/servicio";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return responder(async () => registrarPropuesta(await leerJson(req) as any));
}
