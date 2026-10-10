import { responder } from "@/lib/api";
import { cartera, opcionesFiltros } from "@/lib/servicio";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return responder(() => {
    const p = new URL(req.url).searchParams;
    const get = (k: string) => p.get(k) || undefined;
    return { filas: cartera({ tramo: get("tramo"), tipo: get("tipo"), estado: get("estado"), zona: get("zona"), q: get("q") }), filtros: opcionesFiltros() };
  });
}
