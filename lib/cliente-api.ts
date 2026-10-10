import type { situacion } from "./servicio";

export type Situacion = ReturnType<typeof situacion>;

export async function api<T = any>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Tuvimos un problema. Intenta de nuevo.");
  return j as T;
}

export const soles = (n: number) => "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
