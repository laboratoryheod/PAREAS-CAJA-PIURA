// MOTOR DE CONSEJOS de Mis Finanzas (adviceEngine): reglas simples, sin IA. Devuelve como máximo 3 consejos,
// en lenguaje claro y de usted, cada uno con una acción opcional.
import { soles } from "./fecha";
import type { Categoria, ResumenMensual } from "./finanzas";

export type AccionConsejo = "pagar" | "asesor" | "ver_gastos" | "agregar_ingreso" | "agregar_gasto";
export interface Consejo { id: string; tono: "alerta" | "aviso" | "bien"; texto: string; accion?: { tipo: AccionConsejo; texto: string } }

export const MAX_CONSEJOS = 3;
export const UMBRALES_CONSEJOS = { gastoAlto: 80, categoriaAlta: 40 }; // % del ingreso

export function consejosFinanzas(r: ResumenMensual, categorias: Categoria[]): Consejo[] {
  const nombre = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? "Otros";
  const lista: Consejo[] = [];

  if (r.ingresos <= 0) {
    lista.push({ id: "sin_ingresos", tono: "aviso", texto: "Registre cuánto gana al mes para saber cuánto le sobra después de pagar su cuota.", accion: { tipo: "agregar_ingreso", texto: "Agregar ingreso" } });
    if (r.gastos <= 0) lista.push({ id: "sin_gastos", tono: "aviso", texto: "Anote sus gastos del mes, aunque sean pequeños: así verá en qué se va su dinero.", accion: { tipo: "agregar_gasto", texto: "Agregar gasto" } });
  }
  if (r.vencido > 0) lista.push({ id: "vencido", tono: "alerta", texto: `Tiene ${soles(r.vencido)} por pagar ya. Pagar hoy detiene el CHICOTAZO y el interés moratorio.`, accion: { tipo: "pagar", texto: "Pagar mi deuda" } });
  if (r.noAlcanza) lista.push({ id: "no_alcanza", tono: "alerta", texto: "Este mes su dinero no alcanza para su cuota. Un asesor de la Caja puede revisar sus opciones con usted.", accion: { tipo: "asesor", texto: "Hablar con un asesor" } });
  if (r.ingresos > 0 && (r.gastos / r.ingresos) * 100 > UMBRALES_CONSEJOS.gastoAlto)
    lista.push({ id: "gasto_alto", tono: "aviso", texto: "Está gastando casi todo lo que gana. Mire en qué categoría puede reducir.", accion: { tipo: "ver_gastos", texto: "Ver mis gastos" } });
  const mayor = r.porCategoria[0];
  if (mayor && r.ingresos > 0 && mayor.pctIngreso > UMBRALES_CONSEJOS.categoriaAlta)
    lista.push({ id: "categoria_alta", tono: "aviso", texto: `Su gasto en ${nombre(mayor.categoria)} es el más alto. Revise si puede bajarlo.`, accion: { tipo: "ver_gastos", texto: "Ver mis gastos" } });
  if (r.ingresos > 0 && r.sobra > 0)
    lista.push({ id: "sobra", tono: "bien", texto: `Le sobran ${soles(r.sobra)}. Separe una parte para pagar su próxima cuota a tiempo y otra para emergencias.`, accion: r.cuota > 0 ? { tipo: "pagar", texto: "Ver mi cuota" } : undefined });
  if (r.porAmbito.negocio > 0 && r.porAmbito.personal > 0 && lista.length < MAX_CONSEJOS)
    lista.push({ id: "separar", tono: "bien", texto: "Bien por separar los gastos del negocio de los de su casa: así sabe cuánto gana de verdad su negocio." });

  return lista.slice(0, MAX_CONSEJOS);
}
