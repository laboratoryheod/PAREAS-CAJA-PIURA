// Respuestas sin IA. Los montos y fechas SIEMPRE vienen de situacion() en el servidor.
import { fechaLarga, soles } from "@/lib/fecha";
import type { cuotaParaFinanzas, situacion } from "@/lib/servicio";
import { norm } from "./guardia";

type Sit = ReturnType<typeof situacion>;
export interface RespuestaAsistente { respuesta: string; derivar: boolean; fuente: "faq" | "gemini" | "openai" | "filtro" }

const tiene = (t: string, ...palabras: string[]) => palabras.some((p) => t.includes(p));

/** Datos sensibles: el asistente nunca los pide ni los procesa. */
export function mencionaDatosSensibles(texto: string): boolean {
  const t = norm(texto);
  return tiene(t, "contrasena", "clave", "password", "token", "cvv", "pin ") || /\d{13,19}/.test(texto.replace(/(?<=\d)[\s-]+(?=\d)/g, "")) || tiene(t, "numero de tarjeta", "nro de tarjeta");
}
export const RESPUESTA_SENSIBLE = "Por su seguridad: nunca le pediremos contraseñas, claves, número de tarjeta ni token digital, ni por aquí ni por teléfono. No los comparta con nadie. ¿Le ayudo con su deuda o su plan?";

export function pideAyudaHumana(texto: string): boolean {
  const t = norm(texto);
  return tiene(t, "hablar con una persona", "hablar con un gestor", "con un asesor", "persona real", "humano", "no puedo mas", "desesper", "angusti", "me quiero morir", "me amenaz", "llorar", "deprimid");
}
export const RESPUESTA_DERIVAR = "Lo entiendo. Ya avisé a un gestor para que se comunique con usted y lo acompañe. Su información está segura.";

/**
 * Intenta responder con plantillas. Devuelve null si no reconoce la pregunta
 * (solo entonces, y si está en tema, se gasta IA).
 */
export function respuestaFaq(texto: string, s: Sit, extra?: { credito?: ReturnType<typeof cuotaParaFinanzas> }): RespuestaAsistente | null {
  const t = norm(texto);
  const ok = (respuesta: string): RespuestaAsistente => ({ respuesta, derivar: false, fuente: "faq" });

  if (tiene(t, "condon", "perdon", "perdonar", "rebaja", "bajar la tasa", "cambiar la tasa", "quitar el interes", "quitar la mora"))
    return ok(s.regalo
      ? `Actualmente tiene un Modo Rescate: paga ${soles(s.regalo.montoHoy)} hoy en lugar de ${soles(s.regalo.base)}. Es la condición que puedo ofrecerle.`
      : "No puedo ofrecer condonaciones ni cambios de tasa. Si su dinero no alcanza, un asesor de la Caja puede revisar su caso. ¿Desea que lo contacte?");

  if (tiene(t, "regalo", "campana", "salvador", "rescate", "descuento")) {
    if (!s.regalo) return ok("El Modo Rescate es una campaña de la Caja: paga hoy un 30 % menos de lo vencido y recupera ese monto con un 10 % más en sus 3 cuotas siguientes; vence a los 7 días. La Caja lo activa según cada caso; si se le otorga, le llegará un aviso y lo verá en su inicio.");
    const r = s.regalo;
    return ok(`Tiene un Modo Rescate: paga ${soles(r.montoHoy)} hoy (${r.descuentoPct}% menos) y el descuento se recupera con ${r.recargoPct}% más en sus 3 cuotas siguientes. Vence el ${r.venceLargo}.`);
  }

  if (tiene(t, "vence", "vencimiento", "proxima cuota", "siguiente cuota", "cuando pago", "cuando tengo que pagar", "fecha de pago", "mi cuota")) {
    const c = extra?.credito?.proxima;
    const atraso = s.diasAtraso > 0 ? ` Además tiene ${soles(s.deuda.total)} vencidos que conviene pagar hoy para detener el CHICOTAZO.` : "";
    if (c) return ok(`Su próxima ${c.concepto === "plan" ? "cuota del plan" : "cuota"} es de ${soles(c.monto)} y vence el ${fechaLarga(c.fecha)} (${c.diasFaltan === 0 ? "hoy" : c.diasFaltan === 1 ? "mañana" : `faltan ${c.diasFaltan} días`}).${atraso}`);
    if (s.diasAtraso > 0) return ok(`No tiene cuotas próximas registradas, pero sí ${soles(s.deuda.total)} vencidos. Puede pagarlos desde “Pagar hoy”.`);
  }

  if (tiene(t, "cuanto debo", "mi deuda", "cuanto es", "saldo", "cuanto pago", "monto", "cuanto tengo que")) {
    if (s.estado === "al_dia") return ok("Está al día: no tiene cuotas vencidas. Gracias por su puntualidad.");
    if ((s.estado === "reprogramado" || s.estado === "plan_pendiente") && s.propuestaActiva) {
      const p = s.propuestaActiva.pagos.find((x) => !x.pagado);
      return ok(p ? `Tiene un plan por ${soles(s.propuestaActiva.total)}. Su próximo pago es de ${soles(p.monto)} el ${p.fechaLarga}.${s.estado === "plan_pendiente" ? " Con ese primer pago se activa su plan y se detiene el CHICOTAZO." : ""}` : "Su plan de pago está completo. Gracias.");
    }
    return ok(`Hoy su deuda es de ${soles(s.deuda.total)}: ${soles(s.deuda.montoVencido)} de cuotas vencidas y ${soles(s.deuda.interesMoratorio)} de interés moratorio, con ${s.diasAtraso} días de atraso. Puede pagarla desde “Pagar hoy”.`);
  }

  if (tiene(t, "reprogram", "plan", "cuotas", "opcion", "fraccion", "en partes", "facilidad", "refinanc")) {
    if (s.propuestaActiva) return ok("Ya tiene un plan activo. Puede pagar su siguiente cuota desde “Pagar hoy”.");
    if (s.estado === "al_dia") return ok("No necesita reprogramar: está al día. En “Mis Finanzas” puede ver cuánto le queda cada mes para su cuota.");
    return ok("La reprogramación la revisa un asesor de la Caja. Puede pedir que lo contacten con el botón de ayuda y, mientras tanto, ver en “Mis Finanzas” cuánto puede destinar a su cuota.");
  }

  if (tiene(t, "como pago", "donde pago", "pagar", "qr", "yape", "agencia", "familiar", "transferencia"))
    return ok("Ingrese a “Pagar hoy”. Ahí encontrará un código QR que también puede usar un familiar para pagar por usted.");

  if (tiene(t, "punto", "score", "pareas", "nivel", "bronce", "plata", "oro", "chicotazo", "racha"))
    return ok(`Tiene ${s.score} puntos, nivel ${s.nivel}. ${s.siguienteNivel.texto}. Pagar a tiempo y la trivia suman; en mora el CHICOTAZO resta 12 puntos por día y la racha no cuenta.`);

  if (tiene(t, "interes", "mora", "moratorio"))
    return ok(`El interés moratorio se suma por cada día de atraso. Hoy asciende a ${soles(s.deuda.interesMoratorio)}. Mientras antes se ponga al día, menos pagará.`);

  if (tiene(t, "presupuesto", "ahorro", "ahorrar", "gastos", "negocio", "ventas"))
    return ok("Una buena práctica: al cobrar sus ventas, separe primero el monto de su cuota y no mezcle el dinero del negocio con los gastos del hogar. En “Mis Finanzas” puede anotar sus ingresos y gastos y ver cuánto le sobra.");

  if (tiene(t, "hola", "buenas", "habla", "que tal", "ayuda"))
    return ok(`Hola, ${s.cliente.nombre}. Puedo informarle cuánto debe, cómo pagar y cómo organizar sus gastos. ¿En qué le ayudo?`);

  if (tiene(t, "gracias", "chevere", "listo", "ok"))
    return ok("Con gusto. Quedo atento a cualquier consulta sobre su deuda o sus finanzas.");

  return null;
}

export function respuestaGenerica(s: Sit): RespuestaAsistente {
  return { respuesta: `Puedo ayudarle con su deuda, cómo pagar, sus puntos y sus finanzas, ${s.cliente.nombre}. Si prefiere hablar con una persona, escriba “quiero hablar con un gestor”.`, derivar: false, fuente: "faq" };
}
