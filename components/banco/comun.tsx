"use client";
// Piezas compartidas por las páginas del gestor (Resumen, Cartera, Modo Rescate).
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usarPolling } from "@/lib/usar-polling";

export const ETIQ_ESTADO: Record<string, string> = { en_mora: "En mora", plan_pendiente: "Plan sin 1er pago", reprogramado: "Plan en marcha", incumplido: "Incumplió (sin beneficios)", derivado: "Derivado a gestor", al_dia: "Al día" };
export const COLOR_ESTADO: Record<string, string> = { en_mora: "bg-amber-100", plan_pendiente: "bg-sky-100", reprogramado: "bg-green-100", incumplido: "bg-rose-200", derivado: "bg-red-100", al_dia: "bg-blue-100" };

export interface Filtros { tramo: string; tipo: string; estado: string; zona: string }
export const FILTROS_VACIOS: Filtros = { tramo: "", tipo: "", estado: "", zona: "" };
export interface OpcionesFiltros { zonas: string[]; tipos: string[]; tramos: string[]; estados: string[] }

/** Reutiliza las filas que no cambiaron para que React.memo evite re-renderizarlas. */
export function reconciliar<T extends { id: number }>(prev: T[], next: T[]): T[] {
  const porId = new Map(prev.map((x) => [x.id, x]));
  let igual = prev.length === next.length;
  const out = next.map((x, i) => {
    const p = porId.get(x.id);
    const mismo = p && JSON.stringify(p) === JSON.stringify(x);
    if (!mismo || prev[i] !== p) igual = false;
    return mismo ? p! : x;
  });
  return igual ? prev : out;
}

/** Si la sesión del gestor venció, vuelve al login. */
export function usarSinSesion() {
  const router = useRouter();
  return useCallback((e: any) => { if (String(e?.message).includes("Sesión")) router.push("/banco/login"); }, [router]);
}

/**
 * Lee `url` al montar, cuando cambia y cada `ms` (pausado con la pestaña en segundo plano).
 * Compara el texto crudo de la respuesta con el anterior: si no cambió, no se parsea ni se vuelve a pintar
 * (evita JSON.stringify de listas grandes en cada consulta).
 */
export function usarDatos<T>(url: string, ms = 5000) {
  const [datos, setDatos] = useState<T | null>(null);
  const sinSesion = usarSinSesion();
  const ultimo = useRef<{ url: string; texto: string } | null>(null);
  const leer = useCallback(async () => {
    if (!url) return;
    try {
      const r = await fetch(url, { cache: "no-store" });
      const texto = await r.text();
      if (!r.ok) { let msg = "Tuvimos un problema. Intente de nuevo."; try { msg = JSON.parse(texto).error ?? msg; } catch { /* sin cuerpo */ } throw new Error(msg); }
      if (ultimo.current?.url === url && ultimo.current.texto === texto) return;
      ultimo.current = { url, texto };
      setDatos(JSON.parse(texto) as T);
    } catch (e) { sinSesion(e); }
  }, [url, sinSesion]);
  useEffect(() => { leer(); }, [leer]);
  usarPolling(leer, ms);
  /** Fuerza la lectura aunque la respuesta sea igual (tras una acción del gestor). */
  const recargar = useCallback(() => { ultimo.current = null; return leer(); }, [leer]);
  return { datos, recargar };
}

export const consulta = (o: Record<string, string>) => new URLSearchParams(Object.entries(o).filter(([, v]) => v)).toString();

export function Sel({ valor, onChange, vacio, opciones, etiqueta }: { valor: string; onChange: (v: string) => void; vacio: string; opciones: [string, string][]; etiqueta: string }) {
  return (
    <select aria-label={etiqueta} value={valor} onChange={(e) => onChange(e.target.value)} className="min-h-[44px] rounded-xl border border-caja-borde bg-white px-2">
      <option value="">{vacio}</option>
      {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );
}

/** Filtros de la cartera (tramo, tipo de crédito, estado y zona). */
export function SelectoresFiltros({ f, setF, op }: { f: Filtros; setF: (f: Filtros) => void; op: OpcionesFiltros }) {
  return (
    <>
      <Sel etiqueta="Tramo" valor={f.tramo} onChange={(v) => setF({ ...f, tramo: v })} vacio="Todos los tramos" opciones={op.tramos.map((t) => [t, t === "al_dia" ? "Al día" : `${t} días`])} />
      <Sel etiqueta="Tipo de crédito" valor={f.tipo} onChange={(v) => setF({ ...f, tipo: v })} vacio="Todo tipo de crédito" opciones={op.tipos.map((t) => [t, t])} />
      <Sel etiqueta="Estado" valor={f.estado} onChange={(v) => setF({ ...f, estado: v })} vacio="Todos los estados" opciones={op.estados.map((t) => [t, ETIQ_ESTADO[t]])} />
      <Sel etiqueta="Zona" valor={f.zona} onChange={(v) => setF({ ...f, zona: v })} vacio="Todas las zonas" opciones={op.zonas.map((t) => [t, t])} />
    </>
  );
}
