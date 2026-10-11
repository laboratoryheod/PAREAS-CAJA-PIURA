"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { FichaApp, IcLatigo, IcMando, IcTarjeta, IcRegalo } from "@/components/iconos";

const REGLAS = [
  { i: IcMando, c: "violeta" as const, t: "Juega la trivia", d: "+2 por acierto, hasta +10 al día. Completa las 5 y suma racha (si estás al día)." },
  { i: IcTarjeta, c: "verde" as const, t: "Paga a tiempo", d: "+15 por cada pago puntual y +20 al cumplir tu plan." },
  { i: IcLatigo, c: "rojo" as const, t: "El CHICOTAZO", d: "En mora, Pareas te quita 12 puntos por día. Solo se calma cuando pagas." },
  { i: IcRegalo, c: "rosa" as const, t: "Campañas de la Caja", d: "Si te atrasas, la Caja puede darte un Regalo Salvador para regularizarte." },
];

/** Hoja de bienvenida estilo iOS: aparece la primera vez a cada usuario y ahí empieza el juego. */
export function Bienvenida({ clienteId, nombre }: { clienteId: number; nombre: string }) {
  const clave = `pareas-bienvenida-${clienteId}`;
  const [ver, setVer] = useState(false);
  useEffect(() => { try { if (!localStorage.getItem(clave)) setVer(true); } catch { setVer(true); } }, [clave]);
  const cerrar = () => { try { localStorage.setItem(clave, "1"); } catch {} setVer(false); };
  return (
    <AnimatePresence>
      {ver && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="bienvenida-titulo"
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[32px] bg-white px-5 pb-8 pt-3 md:rounded-[32px]"
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.5 }}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-200 md:hidden" />
            <div className="relative mx-auto h-36 w-36"><Image src="/pareas/pareas.png" alt="Pareas" fill sizes="144px" className="object-contain" priority /></div>
            <p className="text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0072C6]">Ponte al Día</p>
            <h2 id="bienvenida-titulo" className="text-center text-[28px] font-bold leading-tight tracking-[-0.03em]">¡Habla, {nombre}! Empieza el juego</h2>
            <p className="mt-1 text-center text-[15px] text-neutral-600">Soy Pareas. Tu score parte en 70 puntos. Así se gana y así se pierde:</p>
            <ul className="mt-4 space-y-3">
              {REGLAS.map((r, k) => (
                <motion.li key={r.t} className="flex items-start gap-3" initial={{ opacity: 0, y: 8, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.15 + k * 0.08, type: "spring", bounce: 0 }}>
                  <FichaApp icono={r.i} color={r.c} tam={40} />
                  <div><p className="text-[15px] font-semibold">{r.t}</p><p className="text-[13px] text-neutral-600">{r.d}</p></div>
                </motion.li>
              ))}
            </ul>
            <button onClick={cerrar} className="mt-6 min-h-[52px] w-full rounded-full bg-[#F9A825] text-[17px] font-semibold text-[#1A1A1A] transition-transform active:scale-[0.97]">Empezar</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
