// BLINDAJE DEL ASISTENTE — todo lo que se filtra aquí se responde SIN llamar a la IA (cero tokens).

export const LIMITES_ASISTENTE = {
  maxCaracteres: 300, // lo que se lee del mensaje del cliente
  maxTurnosHistorial: 4, // contexto que viaja a la IA
  maxCaracteresTurno: 300,
  maxTokensRespuesta: 150,
  iaPorClientePorDia: Number(process.env.GEMINI_MAX_CLIENTE_DIA ?? 15),
  iaGlobalPorDia: Number(process.env.GEMINI_MAX_DIA ?? 300),
};

export const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const tiene = (t: string, ...p: string[]) => p.some((x) => t.includes(x));

/** Temas permitidos: la deuda del cliente, la Caja / PAREAS y educación financiera básica. */
const TEMA = [
  "deuda", "debo", "deber", "cuota", "pago", "pagar", "pague", "plan", "reprogram", "refinanc", "interes", "mora", "atras", "vencid",
  "caja", "piura", "pareas", "ponte al dia", "credito", "prestamo", "ahorro", "ahorrar", "presupuesto", "gasto", "ingreso", "negocio",
  "venta", "puntos", "punto", "score", "nivel", "bronce", "plata", "oro", "pareas", "pacaso", "iguana", "chicotazo", "trivia", "racha", "regalo", "campana",
  "descuento", "gestor", "asesor", "qr", "tasa", "tea", "fecha", "plazo", "inicial", "cronograma", "beneficio", "condon", "perdon",
  "dinero", "soles", "s/", "plata", "cuenta", "deposit", "agencia", "yape", "transferencia", "familiar", "finanz", "economia", "emprend",
  "bodega", "mototaxi", "mercado", "cobr", "saldo", "monto", "cuanto", "recibo", "comprobante", "seguro", "fraude", "estafa",
];

const SALUDO = ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "gracias", "ok", "listo", "chevere", "ya", "si", "no", "habla", "que tal", "ayuda", "ayudame"];

/** Intentos de manipular al asistente para que salga de su rol. */
const INYECCION = [
  "ignora", "olvida tus", "olvida las", "instrucciones", "system prompt", "prompt", "actua como", "actuar como", "haz de cuenta",
  "finge", "eres ahora", "a partir de ahora eres", "jailbreak", "modo desarrollador", "developer mode", "sin restricciones", "dan ",
  "rol de", "roleplay", "revela", "tus reglas", "tu configuracion", "ignore", "pretend", "you are now",
];

/** Señales claras de tema ajeno (aunque se cuele una palabra del tema). */
const AJENO = [
  "poema", "cancion", "chiste", "receta", "futbol", "partido", "pelicula", "serie", "novela", "horoscopo", "tarea", "examen",
  "programa en", "codigo", "python", "javascript", "traduce", "traducir", "redacta", "ensayo", "politica", "presidente", "eleccion",
  "religion", "clima", "noticias", "bitcoin", "cripto", "acciones de", "bolsa de valores", "invertir en", "apuesta", "casino", "loteria",
  "novia", "novio", "medico", "receta medica", "abogado", "juicio", "demanda judicial",
];

/** sin_tema: no trae ninguna palabra del tema (puede ser un "¿y eso?" de seguimiento). */
export type Clase = "vacio" | "inyeccion" | "ajeno" | "sin_tema" | "saludo" | "en_tema";

export function clasificar(texto: string): Clase {
  const t = norm(texto);
  if (!t) return "vacio";
  if (tiene(t, ...INYECCION)) return "inyeccion";
  if (tiene(t, ...AJENO)) return "ajeno";
  if (tiene(t, ...TEMA)) return "en_tema";
  if (t.length <= 25 && SALUDO.some((s) => t === s || t.startsWith(s + " ") || t.startsWith(s + ","))) return "saludo";
  return "sin_tema";
}

export const RESPUESTA_AJENO = "Disculpe, solo puedo ayudarle con su deuda, su plan de pago, sus puntos, temas de la Caja y consejos de finanzas personales. ¿Desea consultar su deuda o armar su plan?";
export const RESPUESTA_INYECCION = "No puedo realizar esa acción. Solo puedo ayudarle con su deuda, su plan de pago y temas de la Caja. ¿En qué le ayudo?";
export const RESPUESTA_CUPO = "Hoy ya realizó muchas consultas. Puedo seguir ayudándole con las preguntas frecuentes: su deuda, su plan y cómo pagar.";
