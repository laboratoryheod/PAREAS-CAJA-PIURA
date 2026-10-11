import { responder } from "@/lib/api";
import { distribucionCartera, opcionesFiltros } from "@/lib/servicio";

export const dynamic = "force-dynamic";

/** Porcentaje de morosos, impagos y clientes que pagaron, con los filtros de la cartera (sin búsqueda por DNI). */
export async function GET(req: Request) {
  return responder(() => {
    const p = new URL(req.url).searchParams;
    const get = (k: string) => p.get(k) || undefined;
    return { ...distribucionCartera({ tramo: get("tramo"), tipo: get("tipo"), estado: get("estado"), zona: get("zona") }), filtros: opcionesFiltros() };
  });
}
