import { LIMITES_ASISTENTE } from "./guardia";
import { hechos, limitarOraciones, REGLAS_ASISTENTE, type Sit, type Turno } from "./prompt";

export type { Turno } from "./prompt";
export { limitarOraciones } from "./prompt";

export async function consultarGemini(s: Sit, mensaje: string, historial: Turno[], contexto = hechos(s)): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const modelo = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const contents = [
    ...historial.map((t) => ({ role: t.rol === "usuario" ? "user" : "model", parts: [{ text: t.texto }] })),
    { role: "user", parts: [{ text: mensaje }] },
  ];
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${REGLAS_ASISTENTE}\n\nHECHOS (verificados por el servidor):\n${contexto}` }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: LIMITES_ASISTENTE.maxTokensRespuesta },
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const texto = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    return texto ? limitarOraciones(texto, 3) : null;
  } catch {
    return null; // sin red o error → el llamador usa el FAQ
  }
}

