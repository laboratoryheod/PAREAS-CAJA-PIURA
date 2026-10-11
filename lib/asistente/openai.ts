// Asistente con OpenAI (Chat Completions). Se usa si existe OPENAI_API_KEY (en .env.local, nunca en el código).
// Recibe las mismas reglas y HECHOS del servidor que Gemini: el modelo solo redacta, no calcula montos ni fechas.
import { LIMITES_ASISTENTE } from "./guardia";
import { hechos, limitarOraciones, REGLAS_ASISTENTE, type Sit, type Turno } from "./prompt";

export const MODELO_OPENAI_POR_DEFECTO = "gpt-4o-mini";

/** Último error de conexión con OpenAI (para el diagnóstico de /api/asistente/estado). Nunca incluye la clave. */
export let ultimoErrorOpenAI: string | null = null;

export async function consultarOpenAI(s: Sit, mensaje: string, historial: Turno[], contexto = hechos(s)): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const modelo = process.env.OPENAI_MODEL || MODELO_OPENAI_POR_DEFECTO;
  const messages = [
    { role: "system", content: `${REGLAS_ASISTENTE}\n\nHECHOS (verificados por el servidor):\n${contexto}` },
    ...historial.map((t) => ({ role: t.rol === "usuario" ? "user" : "assistant", content: t.texto })),
    { role: "user", content: mensaje },
  ];
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: modelo, messages, temperature: 0.4, max_tokens: LIMITES_ASISTENTE.maxTokensRespuesta }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
      ultimoErrorOpenAI = `HTTP ${r.status}${j.error?.code ? ` (${j.error.code})` : ""}`;
      console.error(`[asistente] OpenAI respondió ${ultimoErrorOpenAI}`);
      return null;
    }
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const texto = j.choices?.[0]?.message?.content?.trim();
    ultimoErrorOpenAI = null;
    return texto ? limitarOraciones(texto, 3) : null;
  } catch (e) {
    ultimoErrorOpenAI = e instanceof Error ? e.name : "error de red";
    console.error(`[asistente] Sin conexión con OpenAI: ${ultimoErrorOpenAI}`);
    return null; // sin red o error → el llamador responde con el FAQ
  }
}
