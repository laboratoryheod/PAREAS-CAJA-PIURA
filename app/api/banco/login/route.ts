import { NextResponse } from "next/server";
import { leerJson } from "@/lib/api";

export const dynamic = "force-dynamic";

const USUARIO = process.env.BANCO_USUARIO ?? "gestor";
const CLAVE = process.env.BANCO_CLAVE ?? "caja2026";

export async function POST(req: Request) {
  const b = await leerJson(req);
  if (b.usuario !== USUARIO || b.clave !== CLAVE) return NextResponse.json({ error: "Usuario o clave incorrectos" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  // ROADMAP: sesión firmada/JWT + 2FA/biometría (passkeys/WebAuthn) provistas por la app de Caja Piura.
  res.cookies.set("banco_sesion", "gestor-activo", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("banco_sesion", "", { path: "/", maxAge: 0 });
  return res;
}
