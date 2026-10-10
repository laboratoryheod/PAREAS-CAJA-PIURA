// Respuestas de respaldo (sin IA). Los montos y fechas SIEMPRE vienen de situacion() en el servidor.
import { soles } from "@/lib/fecha";
import type { situacion } from "@/lib/servicio";

type Sit = ReturnType<typeof situacion>;
export interface RespuestaAsistente { respuesta: string; derivar: boolean; fuente: "faq" | "gemini" | "filtro" }

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const tiene = (t: string, ...palabras: string[]) => palabras.some((p) => t.includes(p));

/** Datos sensibles: el asistente nunca los pide ni los procesa. */
export function mencionaDatosSensibles(texto: string): boolean {
  const t = norm(texto);
  return tiene(t, "contrasena", "clave", "password", "token", "cvv", "pin ") || /\d{13,19}/.test(texto.replace(/(?<=\d)[\s-]+(?=\d)/g, "")) || tiene(t, "numero de tarjeta", "nro de tarjeta");
}
export const RESPUESTA_SENSIBLE = "Por tu seguridad, nunca te pediremos ni debes compartir contraseñas, claves, número de tarjeta ni token digital, ni por aquí ni por teléfono. Puedo ayudarte con tu deuda o tu plan de pago.";

export function pideAyudaHumana(texto: string): boolean {
  const t = norm(texto);
  return tiene(t, "hablar con una persona", "hablar con un gestor", "gestor", "asesor", "persona real", "humano", "no puedo mas", "desesper", "angusti", "me quiero morir", "abogado", "demanda", "me amenaz");
}
export const RESPUESTA_DERIVAR = "Entiendo. Voy a avisar a un gestor para que se comunique contigo con calma y te acompañe. Mientras tanto, tu información está segura.";

export function respuestaFaq(texto: string, s: Sit): RespuestaAsistente {
  const t = norm(texto);
  const ok = (respuesta: string, derivar = false): RespuestaAsistente => ({ respuesta, derivar, fuente: "faq" });

  if (tiene(t, "condon", "perdon", "perdonar", "rebaja", "descuento", "bajar la tasa", "cambiar la tasa", "quitar el interes"))
    return ok("No puedo prometer condonaciones ni cambios de tasa. Sí puedo mostrarte cómo armar un plan de pago con las condiciones vigentes. ¿Lo vemos?");

  if (tiene(t, "cuanto debo", "mi deuda", "cuanto es", "saldo", "cuanto pago", "monto")) {
    if (s.estado === "al_dia") return ok("Estás al día, no tienes cuotas vencidas. ¡Felicitaciones!");
    if (s.estado === "reprogramado" && s.propuestaActiva) {
      const p = s.propuestaActiva.pagos.find((x) => !x.pagado);
      return ok(p ? `Tienes un plan de pago activo por ${soles(s.propuestaActiva.total)}. Tu próximo pago es de ${soles(p.monto)} el ${p.fechaLarga}.` : "Tu plan de pago está completo. ¡Gracias!");
    }
    return ok(`Hoy debes ${soles(s.deuda.total)}: ${soles(s.deuda.montoVencido)} de cuotas vencidas y ${soles(s.deuda.interesMoratorio)} de interés moratorio, con ${s.diasAtraso} días de atraso. Si quieres, armamos un plan para pagarlo en cuotas.`);
  }

  if (tiene(t, "reprogram", "plan", "cuotas", "opcion", "fraccion", "pagar en partes", "facilidad")) {
    if (!s.limites) return ok(s.estado === "reprogramado" ? "Ya tienes un plan activo; solo se permite uno a la vez. Puedes seguir pagándolo desde “Pagar”." : "No necesitas reprogramar: estás al día.");
    const l = s.limites;
    const inicial = l.inicialMin > 0 ? `una inicial desde ${soles(l.inicialMin)}` : "sin inicial";
    if (l.derivado) return ok(`Con ${s.diasAtraso} días de atraso, tu propuesta la revisa un gestor. Puedes dejarla desde “Armar mi plan” con una inicial de al menos ${soles(l.inicialMin)}.`);
    return ok(`Para tu situación puedes pagar hasta en ${l.maxCuotas} cuotas, ${inicial}. En “Armar mi plan” lo ves al instante.`);
  }

  if (tiene(t, "como pago", "donde pago", "pagar", "qr", "yape", "agente", "familiar", "transferencia"))
    return ok("Puedes pagar desde “Pagar hoy”. Ahí aparece un código QR que también puede usar un familiar o amigo para pagar por ti.");

  if (tiene(t, "punto", "score", "pacaso", "nivel", "bronce", "plata", "oro", "chicotazo"))
    return ok(`Tienes ${s.score} puntos, nivel ${s.nivel}. ${s.siguienteNivel.texto}. Pagar a tiempo y jugar la trivia suman puntos. ${s.beneficios}`);

  if (tiene(t, "interes", "mora", "moratorio"))
    return ok(`El interés moratorio se suma por cada día de atraso. Hoy suma ${soles(s.deuda.interesMoratorio)}. Mientras antes te pongas al día, menos se acumula.`);

  if (tiene(t, "presupuesto", "ahorro", "ahorrar", "gastos", "negocio", "educacion financiera"))
    return ok("Un buen hábito: separa primero el dinero de tus cuotas apenas recibas tus ventas, y mantén tus gastos del negocio separados de los de tu casa. En la trivia de hoy puedes aprender más.");

  if (tiene(t, "hola", "buenas", "buenos dias", "buenas tardes", "ayuda"))
    return ok(`¡Hola, ${s.cliente.nombre}! Puedo contarte cuánto debes, qué opciones de plan tienes y cómo pagar. ¿Qué te gustaría saber?`);

  return ok("Puedo ayudarte con tu deuda, tus opciones de plan de pago, cómo pagar y tus puntos. Si prefieres hablar con una persona, dime “quiero hablar con un gestor”.");
}
