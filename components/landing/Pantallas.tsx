"use client";
// Pantallas de muestra para los dispositivos de la landing (ilustrativas, con los datos del cliente de ejemplo).
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { AnilloScore } from "@/components/cliente/inicio/AnilloScore";
import { FichaApp, IcBurbuja, IcBilletera, IcLatigo, IcMando, IcTarjeta, IcEnVivo, IcBillete, IcGestor } from "@/components/iconos";

export function PantallaCliente() {
  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden bg-gradient-to-b from-[#DCE9F8] to-white px-3 pb-6 text-[#1C1C1E]">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-neutral-500">Hoy</p>
        <p className="text-[20px] font-bold leading-tight tracking-[-0.03em]">Hola, Gengis</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[16px] bg-gradient-to-br from-[#5B2EE5] to-[#9B4DFF] p-2.5 text-white">
          <FichaApp icono={IcMando} color="violeta" tam={24} />
          <p className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-white/70">Juego del día</p>
          <p className="text-[11px] font-bold leading-tight">Trivia de Pareas</p>
          <p className="mt-1.5 rounded-full bg-white py-1 text-center text-[9px] font-semibold text-[#5B2EE5]">Empezar</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-[16px] bg-white p-1.5">
          <div className="origin-center scale-[0.62]"><AnilloScore score={70} nivel="Plata" trivia={4} topeTrivia={10} mora /></div>
          <p className="-mt-6 text-[9px] font-semibold">Nivel Plata</p>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-[16px] bg-gradient-to-br from-[#7A0F1C] via-[#B3122A] to-[#E2401C] p-2.5 text-white">
        <p className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-[#FFD60A]"><IcLatigo tam={10} />Pareas está pegando</p>
        <p className="text-[19px] font-black italic leading-none tracking-[-0.05em]">¡CHICOTAZO!</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1 text-center">
          {[["-12", "por día"], ["12", "días"], ["-24", "perdidos"]].map(([v, e]) => <div key={e} className="rounded-lg bg-black/20 py-1"><p className="text-[12px] font-bold leading-none">{v}</p><p className="text-[7px] text-white/75">{e}</p></div>)}
        </div>
      </div>
      <div className="rounded-[16px] bg-white p-2.5">
        <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-neutral-500">Su deuda de hoy</p>
        <p className="text-[18px] font-bold tracking-[-0.03em] text-[#C9182B]">S/ 326.08</p>
        {[[IcTarjeta, "azul", "Pagar hoy"], [IcBilletera, "verde", "Mis Finanzas"]].map(([I, c, t]) => (
          <div key={t as string} className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-neutral-50 p-1.5"><FichaApp icono={I as typeof IcTarjeta} color={c as "azul"} tam={18} /><span className="text-[10px] font-medium">{t as string}</span></div>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-2 rounded-[14px] bg-neutral-900 p-2 text-white">
        <span className="relative h-6 w-6 overflow-hidden rounded-[7px] bg-white"><Image src="/pareas/logo.png" alt="" fill sizes="24px" className="object-cover" /></span>
        <span className="text-[10px] font-semibold">Hablar con Pareas</span><IcBurbuja tam={12} className="ml-auto text-[#5AC8FA]" />
      </div>
    </div>
  );
}

/** Contenido de la Dynamic Island del iPhone: el CHICOTAZO como notificación en vivo. */
export function IslaChicotazo() {
  const reducir = useReducedMotion();
  return (
    <div className="flex w-full items-center gap-2">
      <motion.span className="grid h-7 w-7 place-items-center rounded-full bg-[#FF3B30]" animate={reducir ? undefined : { rotate: [0, -14, 10, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 1.6 }}><IcLatigo tam={15} /></motion.span>
      <div className="min-w-0 flex-1 leading-tight"><p className="text-[10px] font-semibold text-[#FF453A]">CHICOTAZO</p><p className="truncate text-[11px] text-white/85">Pareas: −12 pts hoy</p></div>
      <span className="text-[13px] font-bold tabular-nums text-[#FF453A]">−12</span>
    </div>
  );
}

export function PantallaGestor() {
  const kpis = [["Avisos", "100"], ["Abrieron", "36%"], ["Planes", "13"], ["Comprometido", "S/ 9,840"]];
  const feed = [
    [IcTarjeta, "azul", "Gengis G. pagó su deuda", "hace 5 s"],
    [IcBillete, "rescate", "Modo Rescate para Elena N.", "hace 1 min"],
    [IcLatigo, "rojo", "Carmen N. incumplió su plan", "hace 3 min"],
    [IcGestor, "grafito", "Santos Z. pidió hablar con un gestor", "hace 8 min"],
  ] as const;
  return (
    <div className="grid h-full grid-cols-[1fr_1.1fr] gap-3 bg-gradient-to-b from-[#EAF2FC] to-white p-3 text-[#1C1C1E]">
      <div className="space-y-2">
        <p className="text-[13px] font-bold tracking-[-0.02em]">Panel del gestor</p>
        <div className="grid grid-cols-2 gap-1.5">
          {kpis.map(([e, v]) => <div key={e} className="rounded-xl bg-white p-2 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]"><p className="text-[8px] text-neutral-500">{e}</p><p className="text-[14px] font-bold tabular-nums text-[#0047AB]">{v}</p></div>)}
        </div>
        <div className="rounded-xl bg-white p-2 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
          <p className="text-[8px] font-semibold uppercase tracking-[0.06em] text-neutral-500">Cartera por tramo</p>
          {[["1–15 días", 32], ["16–30", 28], ["31–60", 25], ["> 60", 15]].map(([t, v]) => (
            <div key={t as string} className="mt-1 flex items-center gap-1.5 text-[8px]"><span className="w-12 text-neutral-500">{t}</span><span className="h-1.5 rounded-full bg-[#0072C6]" style={{ width: `${(v as number) * 2}%` }} /></div>
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-white p-2 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
        <p className="mb-1 flex items-center gap-1 text-[9px] font-semibold text-[#FF3B30]"><IcEnVivo tam={11} />En tiempo real</p>
        {feed.map(([I, c, t, h]) => (
          <div key={t} className="flex items-center gap-1.5 border-t border-black/5 py-1.5"><FichaApp icono={I} color={c} tam={18} /><span className="min-w-0 flex-1 truncate text-[9px]">{t}</span><span className="text-[7px] text-neutral-400">{h}</span></div>
        ))}
      </div>
    </div>
  );
}
