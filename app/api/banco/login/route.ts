import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { leerJson } from "@/lib/api";
import { COOKIE_SESION, crearSesion, DURACION_SESION_S } from "@/lib/sesion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const USUARIO = process.env.BANCO_USUARIO ?? "gestor";
const CLAVE = process.env.BANCO_CLAVE ?? "caja2026";

// Bloqueo por intentos fallidos (por dirección IP): 5 errores seguidos → 5 minutos de espera
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 5 * 60 * 1000;
const intentos = new Map<string, { fallos: number; hasta: number }>();

const igual = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const esHttps = (req: Request) => new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
const ipDe = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";

export async function POST(req: Request) {
  const ip = ipDe(req);
  const ahora = Date.now();
  const reg = intentos.get(ip);
  if (reg && reg.hasta > ahora) {
    const min = Math.ceil((reg.hasta - ahora) / 60000);
    return NextResponse.json({ error: `Demasiados intentos fallidos. Espere ${min} minuto${min === 1 ? "" : "s"} e intente de nuevo.` }, { status: 429 });
  }
  const b = await leerJson(req);
  if (typeof b.usuario !== "string" || typeof b.clave !== "string" || !igual(b.usuario, USUARIO) || !igual(b.clave, CLAVE)) {
    const fallos = (reg && reg.hasta <= ahora && reg.fallos >= MAX_INTENTOS ? 0 : reg?.fallos ?? 0) + 1;
    intentos.set(ip, { fallos, hasta: fallos >= MAX_INTENTOS ? ahora + BLOQUEO_MS : 0 });
    const quedan = MAX_INTENTOS - fallos;
    return NextResponse.json({ error: quedan > 0 ? `Usuario o clave incorrectos. Le quedan ${quedan} intento${quedan === 1 ? "" : "s"}.` : "Usuario o clave incorrectos. Por seguridad, el acceso quedó bloqueado 5 minutos." }, { status: 401 });
  }
  intentos.delete(ip);
  const res = NextResponse.json({ ok: true });
  // "secure" solo en https: en http (localhost o red local) una cookie secure no se guardaría
  res.cookies.set(COOKIE_SESION, await crearSesion(USUARIO), { httpOnly: true, sameSite: "lax", secure: esHttps(req), path: "/", maxAge: DURACION_SESION_S });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESION, "", { path: "/", maxAge: 0 });
  return res;
}
