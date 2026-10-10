import { NextResponse } from "next/server";
import { ErrorNegocio } from "./servicio";

/** Envuelve un handler: errores de negocio → JSON claro y amable; el resto → 500 sin detalles internos. */
export async function responder(fn: () => unknown | Promise<unknown>) {
  try {
    return NextResponse.json(await fn());
  } catch (e) {
    if (e instanceof ErrorNegocio) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Tuvimos un problema. Intenta de nuevo en unos segundos." }, { status: 500 });
  }
}

export async function leerJson(req: Request): Promise<Record<string, any>> {
  try { return (await req.json()) ?? {}; } catch { return {}; }
}

export function idNumerico(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ErrorNegocio("Identificador inválido");
  return n;
}
