import { NextResponse } from "next/server";
import { MODELO_OPENAI_POR_DEFECTO } from "@/lib/asistente/openai";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico del chatbot: qué proveedor de IA está configurado y si responde. Hace una consulta mínima
 * (unos pocos tokens) solo cuando se llama a esta ruta. Nunca devuelve la clave.
 */
export async function GET() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ proveedor: process.env.GEMINI_API_KEY ? "gemini" : "faq", conectado: null, nota: "Sin OPENAI_API_KEY: el asistente usa Gemini (si hay clave) o el FAQ local." });
  const modelo = process.env.OPENAI_MODEL || MODELO_OPENAI_POR_DEFECTO;
  const t = Date.now();
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: modelo, messages: [{ role: "user", content: "Responde solo: listo" }], max_tokens: 5 }),
      signal: AbortSignal.timeout(10000),
    });
    const j = (await r.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    return NextResponse.json({ proveedor: "openai", modelo, conectado: r.ok, http: r.status, error: r.ok ? undefined : j.error?.code ?? j.error?.message?.slice(0, 120), ms: Date.now() - t });
  } catch (e) {
    return NextResponse.json({ proveedor: "openai", modelo, conectado: false, error: `Sin conexión con api.openai.com (${e instanceof Error ? e.name : "red"})`, ms: Date.now() - t });
  }
}
