"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Ejecuta `fn` cada `ms` mientras la pestaña está visible (Page Visibility API). Al volver a primer
 * plano ejecuta `fn` al instante y retoma el intervalo; en segundo plano no consulta nada.
 */
export function usarPolling(fn: () => unknown, ms: number, activo = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!activo) return;
    let t: ReturnType<typeof setInterval> | undefined;
    const correr = () => { void ref.current(); };
    const arrancar = () => { if (!t) t = setInterval(correr, ms); };
    const parar = () => { if (t) { clearInterval(t); t = undefined; } };
    const alCambiar = () => { if (document.visibilityState === "hidden") parar(); else { correr(); arrancar(); } };
    if (document.visibilityState !== "hidden") arrancar();
    document.addEventListener("visibilitychange", alCambiar);
    return () => { parar(); document.removeEventListener("visibilitychange", alCambiar); };
  }, [ms, activo]);
}

/** Devuelve `valor` con retardo (debounce), para no consultar en cada tecla. */
export function usarDebounce<T>(valor: T, ms: number): T {
  const [v, setV] = useState(valor);
  useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t); }, [valor, ms]);
  return v;
}
