import { getRepo } from "@/lib/db/repo";
import { situacion, pedirAyudaHumana } from "@/lib/servicio";
import { mencionaDatosSensibles, pideAyudaHumana, RESPUESTA_DERIVAR, RESPUESTA_SENSIBLE, respuestaFaq, type RespuestaAsistente } from "./faq";
import { consultarGemini, type Turno } from "./gemini";

export async function conversar(clienteId: number, mensaje: string, historial: Turno[] = []): Promise<RespuestaAsistente> {
  const texto = mensaje.trim().slice(0, 500);
  const s = situacion(clienteId);
  getRepo().insertarEvento(clienteId, "chat", {});
  if (!texto) return respuestaFaq("hola", s);

  // Filtros de seguridad ANTES de llegar al modelo
  if (mencionaDatosSensibles(texto)) return { respuesta: RESPUESTA_SENSIBLE, derivar: false, fuente: "filtro" };
  if (pideAyudaHumana(texto)) {
    pedirAyudaHumana(clienteId, texto);
    return { respuesta: RESPUESTA_DERIVAR, derivar: true, fuente: "filtro" };
  }
  const ia = await consultarGemini(s, texto, historial);
  if (ia) return { respuesta: ia, derivar: false, fuente: "gemini" };
  return respuestaFaq(texto, s);
}
