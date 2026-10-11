import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarSesion } from "@/lib/sesion";

// Acceso del gestor: sesión firmada y con vencimiento (lib/sesion.ts).
// ROADMAP: en la integración, la sesión y los permisos los aporta la app de Caja Piura (SSO) + 2FA.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/banco/login" || pathname === "/api/banco/login") return NextResponse.next();
  if (await verificarSesion(req.cookies.get(COOKIE_SESION)?.value)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sesión de gestor requerida" }, { status: 401 });
  // Detrás de un proxy (Nginx), req.url trae el host interno (127.0.0.1:3000): se usa el host que pidió el navegador
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(/:$/, "");
  return NextResponse.redirect(new URL("/banco/login", host ? `${proto}://${host}` : req.url));
}

export const config = { matcher: ["/banco/:path*", "/api/banco/:path*"] };
