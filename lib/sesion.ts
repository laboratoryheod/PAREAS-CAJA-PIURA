// Sesión del gestor firmada (HMAC-SHA256 con Web Crypto: funciona igual en el middleware y en las rutas).
// El token es "usuario.vence.firma": si alguien cambia cualquier parte, la firma deja de coincidir.
// ROADMAP: en la integración, la sesión la aporta la app de Caja Piura (SSO) con 2FA.

export const COOKIE_SESION = "banco_sesion";
export const DURACION_SESION_S = 60 * 60 * 8; // 8 horas

const enc = new TextEncoder();
const secreto = () => process.env.SESION_SECRETO || `pareas:${process.env.BANCO_CLAVE ?? "caja2026"}:sesion-gestor`;
const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function firmar(texto: string): Promise<string> {
  const clave = await crypto.subtle.importKey("raw", enc.encode(secreto()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", clave, enc.encode(texto)));
}

/** Crea el token de sesión para el usuario (vence en DURACION_SESION_S). */
export async function crearSesion(usuario: string, ahora = Date.now()): Promise<string> {
  const datos = `${usuario}.${Math.floor(ahora / 1000) + DURACION_SESION_S}`;
  return `${datos}.${await firmar(datos)}`;
}

/** Devuelve el usuario si el token es auténtico y no venció; si no, null. */
export async function verificarSesion(token: string | undefined, ahora = Date.now()): Promise<string | null> {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [usuario, vence, firma] = partes;
  if (!/^\d+$/.test(vence) || Number(vence) * 1000 < ahora) return null;
  const esperada = await firmar(`${usuario}.${vence}`);
  // Comparación en tiempo constante
  if (esperada.length !== firma.length) return null;
  let dif = 0;
  for (let i = 0; i < esperada.length; i++) dif |= esperada.charCodeAt(i) ^ firma.charCodeAt(i);
  return dif === 0 ? usuario : null;
}
