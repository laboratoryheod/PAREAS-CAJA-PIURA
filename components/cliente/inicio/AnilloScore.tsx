"use client";
import { motion } from "motion/react";
import { RollingNumber } from "@/components/ui/rolling-number";

const COLOR_NIVEL: Record<string, [string, string]> = { Oro: ["#FFD60A", "#FF9F0A"], Plata: ["#9FB7D9", "#5E7FA8"], Bronce: ["#FFB27A", "#D9682B"] };

/** Anillos estilo Actividad de Apple: exterior = score (0-100), interior = trivia de hoy (tope diario). */
export function AnilloScore({ score, nivel, trivia, topeTrivia, mora }: { score: number; nivel: string; trivia: number; topeTrivia: number; mora: boolean }) {
  const [a, b] = COLOR_NIVEL[nivel] ?? COLOR_NIVEL.Plata;
  const anillo = (r: number, valor: number, id: string, ancho: number) => {
    const c = 2 * Math.PI * r;
    return (
      <>
        <circle cx="60" cy="60" r={r} stroke={`url(#${id})`} strokeOpacity={0.18} strokeWidth={ancho} fill="none" />
        <motion.circle cx="60" cy="60" r={r} stroke={`url(#${id})`} strokeWidth={ancho} strokeLinecap="round" fill="none" transform="rotate(-90 60 60)"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.max(0.005, Math.min(1, valor))) }} transition={{ type: "spring", bounce: 0, duration: 1.2 }} />
      </>
    );
  };
  return (
    <div className="relative h-[120px] w-[120px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="g-score" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={mora ? "#FF6A3D" : a} /><stop offset="1" stopColor={mora ? "#C9182B" : b} /></linearGradient>
          <linearGradient id="g-trivia" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5EE08A" /><stop offset="1" stopColor="#1DA851" /></linearGradient>
        </defs>
        {anillo(50, score / 100, "g-score", 14)}
        {anillo(33, trivia / topeTrivia, "g-trivia", 12)}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-bold leading-none tracking-[-0.03em] tabular-nums"><RollingNumber value={score} /></span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">puntos</span>
      </div>
    </div>
  );
}
