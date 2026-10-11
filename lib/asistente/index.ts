import { getRepo } from "@/lib/db/repo";
import { cuotaParaFinanzas, situacion, pedirAyudaHumana } from "@/lib/servicio";
import { mencionaDatosSensibles, pideAyudaHumana, RESPUESTA_DERIVAR, RESPUESTA_SENSIBLE, respuestaFaq, respuestaGenerica, type RespuestaAsistente } from "./faq";
import { consultarGemini, type Turno } from "./gemini";
import { consultarOpenAI } from "./openai";
import { hechos } from "./prompt";
import { clasificar, LIMITES_ASISTENTE, RESPUESTA_AJENO, RESPUESTA_CUPO, RESPUESTA_INYECCION } from "./guardia";

/**
 * Orden de filtros (de más barato a más caro). La IA solo se usa al final, si la pregunta
 * está en tema, ninguna plantilla la resuelve y quedan cupos del día.
 */
export async function conversar(clienteId: number, mensaje: string, historial: Turno[] = []): Promise<RespuestaAsistente> {
  const texto = mensaje.trim().slice(0, LIMITES_ASISTENTE.maxCaracteres);
  const s = situacion(clienteId);
  const repo = getRepo();
  const registrar = (r: RespuestaAsistente) => { repo.insertarEvento(clienteId, "chat", { fuente: r.fuente }); return r; };

  if (mencionaDatosSensibles(texto)) return registrar({ respuesta: RESPUESTA_SENSIBLE, derivar: false, fuente: "filtro" });
  if (pideAyudaHumana(texto)) {
    pedirAyudaHumana(clienteId, texto);
    return registrar({ respuesta: RESPUESTA_DERIVAR, derivar: true, fuente: "filtro" });
  }
  let clase = clasificar(texto);
  // Un seguimiento corto ("¿y si fuera en 3?") dentro de una conversación en curso cuenta como en tema
  if (clase === "sin_tema") clase = historial.length > 0 && texto.length <= 60 ? "en_tema" : "ajeno";
  if (clase === "inyeccion") return registrar({ respuesta: RESPUESTA_INYECCION, derivar: false, fuente: "filtro" });
  if (clase === "ajeno") return registrar({ respuesta: RESPUESTA_AJENO, derivar: false, fuente: "filtro" });

  const credito = cuotaParaFinanzas(clienteId);
  const faq = respuestaFaq(texto || "hola", s, { credito });
  if (faq) return registrar(faq);
  if (clase !== "en_tema") return registrar(respuestaGenerica(s));

  // Cupos diarios de IA (por cliente y global) para no quemar tokens
  const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
  const desde = inicioDia.toISOString();
  if (repo.contarChatsIA(desde, clienteId) >= LIMITES_ASISTENTE.iaPorClientePorDia || repo.contarChatsIA(desde) >= LIMITES_ASISTENTE.iaGlobalPorDia) {
    return registrar({ ...respuestaGenerica(s), respuesta: RESPUESTA_CUPO });
  }
  const limpio = historial.slice(-LIMITES_ASISTENTE.maxTurnosHistorial).map((t) => ({ ...t, texto: t.texto.slice(0, LIMITES_ASISTENTE.maxCaracteresTurno) }));
  // Proveedor de IA: OpenAI si hay OPENAI_API_KEY; si no, Gemini si hay GEMINI_API_KEY; si no, FAQ
  const contexto = hechos(s, { credito });
  if (process.env.OPENAI_API_KEY) {
    const ia = await consultarOpenAI(s, texto, limpio, contexto);
    if (ia) return registrar({ respuesta: ia, derivar: false, fuente: "openai" });
  } else {
    const ia = await consultarGemini(s, texto, limpio, contexto);
    if (ia) return registrar({ respuesta: ia, derivar: false, fuente: "gemini" });
  }
  return registrar(respuestaGenerica(s));
}
