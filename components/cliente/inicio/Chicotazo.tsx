"use client";
import { motion, useReducedMotion } from "motion/react";
import type { Situacion } from "@/lib/cliente-api";
import { IcCheck, IcLatigo } from "@/components/iconos";

const GOLPE = { duration: 1.1, repeat: Infinity, repeatDelay: 2.4, ease: "easeOut" as const };

/** El látigo de Pareas: la tralla se dibuja, chasquea y la tarjeta tiembla. */
function LatigoAnimado() {
  const reducir = useReducedMotion();
  return (
    <svg viewBox="0 0 160 90" className="h-[78px] w-[150px]" aria-hidden>
      <defs>
        <linearGradient id="mango" x1="0" x2="1"><stop offset="0" stopColor="#5C2A10" /><stop offset="1" stopColor="#9A4A1E" /></linearGradient>
      </defs>
      <path d="M10 82 L34 60" stroke="url(#mango)" strokeWidth="9" strokeLinecap="round" />
      <path d="M8 84 L14 78" stroke="#F9A825" strokeWidth="9" strokeLinecap="round" />
      <motion.path d="M34 60 C 58 36, 70 70, 96 44 S 132 18, 150 30" stroke="#FFE4C4" strokeWidth="3.2" strokeLinecap="round" fill="none"
        initial={false} animate={reducir ? { pathLength: 1 } : { pathLength: [0.15, 1, 1, 0.15] }} transition={reducir ? undefined : { ...GOLPE, times: [0, 0.35, 0.7, 1] }} />
      {!reducir && [0, 40, 80, 120, 160, 200, 240, 280, 320].map((a) => (
        <motion.line key={a} x1="150" y1="30" x2={150 + 14 * Math.cos((a * Math.PI) / 180)} y2={30 + 14 * Math.sin((a * Math.PI) / 180)} stroke="#FFD60A" strokeWidth="2.4" strokeLinecap="round"
          initial={false} animate={{ opacity: [0, 0, 1, 0], scale: [0.4, 0.4, 1.2, 1.4] }} style={{ transformOrigin: "150px 30px" }} transition={{ ...GOLPE, times: [0, 0.32, 0.4, 0.6] }} />
      ))}
    </svg>
  );
}

export function TarjetaChicotazo({ ch, onPagar }: { ch: Situacion["chicotazo"]; onPagar?: () => void }) {
  const reducir = useReducedMotion();
  if (!ch.activo) {
    return (
      <div className="rounded-[22px] bg-gradient-to-br from-[#1E2A22] to-[#0E1511] p-4 text-white">
        <div className="flex items-center gap-2 text-[#5EE08A]"><IcCheck tam={20} /><span className="text-[13px] font-semibold uppercase tracking-[0.08em]">Látigo guardado</span></div>
        <p className="mt-2 text-[28px] font-black leading-none tracking-[-0.04em] text-white/90">CHICOTAZO</p>
        <p className="mt-2 text-[14px] text-white/75">Está al día: Pareas guardó el látigo. Si una cuota vence, el CHICOTAZO vuelve a restar {ch.porDia} puntos por día.</p>
        {ch.golpes > 0 && <p className="mt-2 text-[12px] text-white/50 tabular-nums">Golpes recibidos en el módulo: {ch.golpes} ({ch.puntosPerdidos} pts)</p>}
      </div>
    );
  }
  return (
    <motion.div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#7A0F1C] via-[#B3122A] to-[#E2401C] p-4 text-white"
      initial={false} animate={reducir ? undefined : { x: [0, 0, -5, 4, -2, 0] }} transition={reducir ? undefined : { ...GOLPE, times: [0, 0.36, 0.42, 0.48, 0.54, 0.62] }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,214,10,0.35),transparent_45%)]" />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[#FFD60A]"><IcLatigo tam={18} /><span className="text-[12px] font-semibold uppercase tracking-[0.1em]">Pareas está pegando</span></div>
          <motion.p className="mt-1 text-[34px] font-black italic leading-none tracking-[-0.05em]" initial={false}
            animate={reducir ? undefined : { scale: [1, 1, 1.08, 1] }} transition={reducir ? undefined : { ...GOLPE, times: [0, 0.38, 0.45, 0.6] }}>¡CHICOTAZO!</motion.p>
        </div>
        <LatigoAnimado />
      </div>
      <div className="relative mt-2 grid grid-cols-3 gap-2 text-center">
        {[{ v: `${ch.porDia}`, e: "pts por día" }, { v: `${ch.diasEnMora}`, e: "días en mora" }, { v: `${ch.puntosPerdidos}`, e: "pts perdidos" }].map((x) => (
          <div key={x.e} className="rounded-2xl bg-black/20 px-1 py-2 backdrop-blur"><p className="text-[22px] font-bold leading-none tabular-nums">{x.v}</p><p className="mt-1 text-[11px] text-white/75">{x.e}</p></div>
        ))}
      </div>
      <p className="relative mt-3 text-[13px] text-white/85">La trivia no lo compensa: máximo +{ch.topeTriviaDia} al día frente a {ch.porDia}. Solo al pagar, Pareas guarda el látigo.</p>
      {onPagar && <button onClick={onPagar} className="relative mt-3 min-h-[44px] w-full rounded-full bg-white text-[15px] font-semibold text-[#B3122A] active:scale-[0.96] transition-transform">Pagar y detener el CHICOTAZO</button>}
    </motion.div>
  );
}
