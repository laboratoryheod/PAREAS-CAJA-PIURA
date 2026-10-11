import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarSesion } from "@/lib/sesion";

// Acceso del gestor: sesión firmada y con vencimiento (lib/sesion.ts).
// ROADMAP: en la integración, la sesión y los permisos los aporta la app de Caja Piura (SSO) + 2FA.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/banco/login" || pathname === "/api/banco/login") return NextResponse.next();
  if (await verificarSesion(req.cookies.get(COOKIE_SESION)?.value)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sesión de gestor requerida" }, { status: 401 });
  return NextResponse.redirect(new URL("/banco/login", req.url));
}

export const config = { matcher: ["/banco/:path*", "/api/banco/:path*"] };
