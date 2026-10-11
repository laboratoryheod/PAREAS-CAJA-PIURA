"use client";
// HERRAMIENTA DE PRUEBA: deja toda la app como recién instalada (base, puntajes, planes, trivia y bienvenida)
// y vuelve al inicio del cliente. Se oculta con MOSTRAR_HERRAMIENTAS_PRUEBA = false en lib/config.ts.
import { useState } from "react";
import { MOSTRAR_HERRAMIENTAS_PRUEBA } from "@/lib/config";
import { IcReiniciar } from "@/components/iconos";
import { cn } from "@/lib/utils";

export function reiniciarTodo(destino = "/cliente") {
  return fetch("/api/pruebas/reset", { method: "POST" }).finally(() => {
    try { Object.keys(localStorage).filter((k) => k.startsWith("pareas-")).forEach((k) => localStorage.removeItem(k)); } catch { /* sin almacenamiento */ }
    window.location.href = destino;
  });
}

export default function BotonReinicio({ className, destino = "/cliente", claro = false }: { className?: string; destino?: string; claro?: boolean }) {
  const [confirmar, setConfirmar] = useState(false);
  const [cargando, setCargando] = useState(false);
  if (!MOSTRAR_HERRAMIENTAS_PRUEBA) return null;
  return (
    <button
      onClick={() => { if (!confirmar) { setConfirmar(true); setTimeout(() => setConfirmar(false), 3000); return; } setCargando(true); reiniciarTodo(destino); }}
      aria-label="Reiniciar la aplicación al estado inicial"
      className={cn("flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors active:scale-[0.96]",
        confirmar ? "bg-[#FF3B30] text-white" : claro ? "bg-white/15 text-white hover:bg-white/25" : "bg-[#EAF2FC] text-[#0047AB] hover:bg-[#D6E4F5]", className)}>
      <IcReiniciar tam={16} className={cn(cargando && "animate-spin")} />
      <span className={cn(!confirmar && "max-sm:hidden")}>{cargando ? "Reiniciando…" : confirmar ? "¿Confirmar?" : "Reiniciar"}</span>
    </button>
  );
}
