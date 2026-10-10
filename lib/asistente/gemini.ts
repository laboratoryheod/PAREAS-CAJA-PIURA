import { fechaLarga, soles } from "@/lib/fecha";
import type { situacion } from "@/lib/servicio";

type Sit = ReturnType<typeof situacion>;
export interface Turno { rol: "usuario" | "asistente"; texto: string }

/** Hechos verificados por el servidor. El modelo NO calcula montos ni fechas: solo los redacta. */
function hechos(s: Sit): string {
  const l: string[] = [
    `Cliente: ${s.cliente.nombre}. Fecha de hoy: ${fechaLarga(s.fechaDemo)}. Estado: ${s.estado}.`,
    `Deuda total hoy: ${soles(s.deuda.total)} (cuotas vencidas ${soles(s.deuda.montoVencido)} + interés moratorio ${soles(s.deuda.interesMoratorio)}). Días de atraso: ${s.diasAtraso}.`,
    `Score: ${s.score} puntos, nivel ${s.nivel}. ${s.siguienteNivel.texto}.`,
  ];
  if (s.limites) l.push(`Opciones de reprogramación: hasta ${s.limites.maxCuotas} cuotas; inicial mínima ${soles(s.limites.inicialMin)}; primer pago hasta el ${fechaLarga(s.limites.primerPagoMax)}; ${s.limites.derivado ? "por los días de atraso la propuesta la revisa un gestor" : "aprobación automática si se cumple"}. Cada cuota debe ser de al menos S/ 20.00.`);
  if (s.propuestaActiva) l.push(`Plan activo: ${s.propuestaActiva.pagos.map((p) => `${p.tipo === "inicial" ? "inicial" : `cuota ${p.n}`} ${soles(p.monto)} el ${p.fechaLarga}${p.pagado ? " (pagado)" : ""}`).join("; ")}.`);
  return l.join("\n");
}

const REGLAS_ASISTENTE = `Eres "el Pacaso", asistente virtual del módulo "Ponte al Día" de una caja municipal. Hablas en español peruano sencillo, tono cálido, formal y orientador, tratando de "tú" al cliente. Máximo 3 oraciones, frases cortas.
Solo respondes sobre: la deuda del cliente, sus opciones de reprogramación, cómo pagar y educación financiera básica.
Usa EXCLUSIVAMENTE los montos y fechas de los HECHOS; nunca calcules ni inventes cifras ni fechas.
No apruebes condiciones fuera de los HECHOS, no prometas condonaciones, no cambies tasas, no des asesoría legal ni de inversión.
Nunca pidas ni aceptes contraseñas, claves, número de tarjeta ni token digital; si el cliente los menciona, recuérdale que no debe compartirlos.
Nunca amenaces ni presiones. Si el cliente está angustiado o pide algo fuera de alcance, ofrece derivarlo a un gestor humano.
Si la pregunta no tiene que ver con lo anterior, di amablemente que solo puedes ayudar con su deuda, su plan de pago y educación financiera.`;

export async function consultarGemini(s: Sit, mensaje: string, historial: Turno[]): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const modelo = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const contents = [
    ...historial.slice(-6).map((t) => ({ role: t.rol === "usuario" ? "user" : "model", parts: [{ text: t.texto.slice(0, 500) }] })),
    { role: "user", parts: [{ text: mensaje.slice(0, 500) }] },
  ];
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${REGLAS_ASISTENTE}\n\nHECHOS (verificados por el servidor):\n${hechos(s)}` }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 220 },
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

export function limitarOraciones(texto: string, max: number): string {
  const partes = texto.replace(/\s+/g, " ").match(/[^.!?¡¿]*[.!?]+|[^.!?]+$/g) ?? [texto];
  return partes.slice(0, max).join("").trim();
}
