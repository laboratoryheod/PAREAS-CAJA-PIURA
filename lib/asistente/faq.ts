// Respuestas sin IA. Los montos y fechas SIEMPRE vienen de situacion() en el servidor.
import { APELATIVO } from "@/lib/config";
import { soles } from "@/lib/fecha";
import type { situacion } from "@/lib/servicio";
import { norm } from "./guardia";

type Sit = ReturnType<typeof situacion>;
export interface RespuestaAsistente { respuesta: string; derivar: boolean; fuente: "faq" | "gemini" | "filtro" }

const tiene = (t: string, ...palabras: string[]) => palabras.some((p) => t.includes(p));

/** Datos sensibles: el asistente nunca los pide ni los procesa. */
export function mencionaDatosSensibles(texto: string): boolean {
  const t = norm(texto);
  return tiene(t, "contrasena", "clave", "password", "token", "cvv", "pin ") || /\d{13,19}/.test(texto.replace(/(?<=\d)[\s-]+(?=\d)/g, "")) || tiene(t, "numero de tarjeta", "nro de tarjeta");
}
export const RESPUESTA_SENSIBLE = `¡Ojo, ${APELATIVO}! Nunca te vamos a pedir contraseñas, claves, número de tarjeta ni token digital, ni por aquí ni por teléfono. No los compartas con nadie. ¿Te ayudo con tu deuda o tu plan?`;

export function pideAyudaHumana(texto: string): boolean {
  const t = norm(texto);
  return tiene(t, "hablar con una persona", "hablar con un gestor", "con un asesor", "persona real", "humano", "no puedo mas", "desesper", "angusti", "me quiero morir", "me amenaz", "llorar", "deprimid");
}
export const RESPUESTA_DERIVAR = `Te entiendo, ${APELATIVO}. Ya le avisé a un gestor para que te llame con calma y te acompañe. Tu información está segura.`;

/**
 * Intenta responder con plantillas. Devuelve null si no reconoce la pregunta
 * (solo entonces, y si está en tema, se gasta IA).
 */
export function respuestaFaq(texto: string, s: Sit): RespuestaAsistente | null {
  const t = norm(texto);
  const ok = (respuesta: string): RespuestaAsistente => ({ respuesta, derivar: false, fuente: "faq" });

  if (tiene(t, "condon", "perdon", "perdonar", "rebaja", "bajar la tasa", "cambiar la tasa", "quitar el interes", "quitar la mora"))
    return ok(s.regalo
      ? `Ahorita tienes un Regalo Salvador: pagas ${soles(s.regalo.montoHoy)} hoy en vez de ${soles(s.regalo.base)}. Es lo que te puedo ofrecer, ${APELATIVO}.`
      : `No puedo prometerte condonaciones ni cambios de tasa, ${APELATIVO}. Lo que sí: armamos un plan de pago con las condiciones vigentes. ¿Le damos?`);

  if (tiene(t, "regalo", "campana", "salvador", "descuento")) {
    if (!s.regalo) return ok(`Las campañas como el Regalo Salvador las activa la Caja según cada caso. Si te sale una, la verás aquí, ${APELATIVO}.`);
    const r = s.regalo;
    return ok(`¡Te salió el Regalo Salvador! Pagas ${soles(r.montoHoy)} hoy (${r.descuentoPct}% menos) y lo recuperas con ${r.recargoPct}% más en tus 3 cuotas siguientes. Vence el ${r.venceLargo}.`);
  }

  if (tiene(t, "cuanto debo", "mi deuda", "cuanto es", "saldo", "cuanto pago", "monto", "cuanto tengo que")) {
    if (s.estado === "al_dia") return ok(`Estás al día, no tienes cuotas vencidas. ¡Chévere, ${APELATIVO}!`);
    if ((s.estado === "reprogramado" || s.estado === "plan_pendiente") && s.propuestaActiva) {
      const p = s.propuestaActiva.pagos.find((x) => !x.pagado);
      return ok(p ? `Tienes un plan por ${soles(s.propuestaActiva.total)}. Tu próximo pago es de ${soles(p.monto)} el ${p.fechaLarga}.${s.estado === "plan_pendiente" ? " Con ese primer pago arranca tu plan y el Pacaso deja de pegar." : ""}` : "Tu plan de pago está completo. ¡Gracias!");
    }
    return ok(`Hoy debes ${soles(s.deuda.total)}: ${soles(s.deuda.montoVencido)} de cuotas vencidas y ${soles(s.deuda.interesMoratorio)} de interés moratorio, con ${s.diasAtraso} días de atraso. ¿Lo pasamos a cuotas?`);
  }

  if (tiene(t, "reprogram", "plan", "cuotas", "opcion", "fraccion", "en partes", "facilidad", "refinanc")) {
    if (s.sinBeneficios) return ok(`Como se pasó un pago de tu plan anterior, por ahora no puedes armar otro, ${APELATIVO}. Puedes pagar lo pendiente desde “Pagar hoy” o esperar una campaña de la Caja.`);
    if (!s.limites) return ok(s.propuestaActiva ? "Ya tienes un plan activo; solo se permite uno a la vez. Lo pagas desde “Pagar hoy”." : "No necesitas reprogramar: estás al día. ¡Bacán!");
    const l = s.limites;
    const inicial = l.inicialMin > 0 ? `con una inicial desde ${soles(l.inicialMin)}` : "sin inicial";
    if (l.derivado) return ok(`Con ${s.diasAtraso} días de atraso, tu propuesta la revisa un gestor. Puedes dejarla en “Armar mi plan” con una inicial de al menos ${soles(l.inicialMin)}.`);
    return ok(`Para tu caso puedes pagar hasta en ${l.maxCuotas} cuotas, ${inicial}. Ojo: el plan arranca con tu primer pago. Míralo al toque en “Armar mi plan”.`);
  }

  if (tiene(t, "como pago", "donde pago", "pagar", "qr", "yape", "agencia", "familiar", "transferencia"))
    return ok(`Fácil, ${APELATIVO}: entra a “Pagar hoy”. Ahí sale un QR que también puede usar un familiar o un pata para pagar por ti.`);

  if (tiene(t, "punto", "score", "pacaso", "nivel", "bronce", "plata", "oro", "chicotazo", "racha"))
    return ok(`Tienes ${s.score} puntos, nivel ${s.nivel}. ${s.siguienteNivel.texto}. Pagar a tiempo y la trivia suman; en mora el Pacaso resta 12 por día y la racha no cuenta.`);

  if (tiene(t, "interes", "mora", "moratorio"))
    return ok(`El interés moratorio se suma por cada día de atraso. Hoy va en ${soles(s.deuda.interesMoratorio)}. Mientras antes te pongas al día, menos pagas.`);

  if (tiene(t, "presupuesto", "ahorro", "ahorrar", "gastos", "negocio", "ventas"))
    return ok("Un buen truco: apenas cobres tus ventas, separa primero la plata de tu cuota, y no mezcles la caja del negocio con los gastos de la casa. En la trivia de hoy hay más tips.");

  if (tiene(t, "hola", "buenas", "habla", "que tal", "ayuda"))
    return ok(`¡Habla, ${s.cliente.nombre}! Te puedo contar cuánto debes, qué plan puedes armar y cómo pagar. ¿Qué necesitas, ${APELATIVO}?`);

  if (tiene(t, "gracias", "chevere", "listo", "ok"))
    return ok(`¡De nada, ${APELATIVO}! Aquí estoy para lo que necesites de tu deuda o tu plan.`);

  return null;
}

export function respuestaGenerica(s: Sit): RespuestaAsistente {
  return { respuesta: `Te puedo ayudar con tu deuda, tu plan de pago, cómo pagar y tus puntos, ${s.cliente.nombre}. Si prefieres hablar con una persona, dime “quiero hablar con un gestor”.`, derivar: false, fuente: "faq" };
}
