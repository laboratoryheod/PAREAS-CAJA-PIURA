"use client";
// Pareas: la iguana (el "pacaso" piurano) mascota del módulo. Ilustración en public/pareas/pareas.png.
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { SpeechBubble } from "@/components/ui/speech-bubble";
import { IcChispa } from "@/components/iconos";

export type HumorPareas = "feliz" | "serio" | "chicotazo";

const CICLO = { duration: 1, repeat: Infinity, repeatDelay: 2 };

/** Onomatopeya tipo cómic que acompaña el chicotazo. */
function Chas() {
  return (
    <motion.div className="pointer-events-none absolute -right-2 -top-3 z-10" initial={false}
      animate={{ scale: [0, 1.25, 1, 0], rotate: [-20, 8, -4, 0], opacity: [0, 1, 1, 0] }} transition={CICLO}>
      <svg width="84" height="56" viewBox="0 0 76 52" aria-hidden>
        <path d="M38 2 46 14 62 6 58 20 74 24 60 32 68 46 52 40 44 50 36 40 20 48 24 34 4 30 18 22 8 10 26 14Z" fill="#F9A825" stroke="#7A2E0E" strokeWidth="2.5" strokeLinejoin="round" />
        <text x="38" y="30" textAnchor="middle" fontSize="10.5" fontWeight="900" fill="#7A2E0E" fontFamily="inherit" letterSpacing="-0.3">CHICOTAZO</text>
      </svg>
    </motion.div>
  );
}

/** El látigo de la cola: un trazo que se dibuja en cada golpe. */
function Latigo() {
  return (
    <svg className="pointer-events-none absolute -left-4 bottom-2 z-0" width="70" height="60" viewBox="0 0 70 60" aria-hidden>
      <motion.path d="M66 54 C 40 50, 30 30, 46 18 S 20 4, 4 10" stroke="#0047AB" strokeWidth="4" strokeLinecap="round" fill="none"
        initial={false} animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }} transition={CICLO} />
    </svg>
  );
}

function Figura({ humor, tam }: { humor: HumorPareas; tam: number }) {
  const reducir = useReducedMotion();
  const anim = reducir ? {} : humor === "chicotazo"
    ? { animate: { rotate: [0, -9, 8, -5, 3, 0], x: [0, -3, 3, -2, 0] }, transition: CICLO }
    : humor === "feliz"
      ? { animate: { y: [0, -8, 0] }, transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const } }
      : { animate: { rotate: [0, 2, 0, -2, 0] }, transition: { duration: 4, repeat: Infinity } };
  return (
    <div className="relative shrink-0" style={{ width: tam, height: tam }}>
      {humor === "chicotazo" && !reducir && <><Latigo /><Chas /></>}
      {humor === "feliz" && !reducir && ["left-0 top-1", "right-1 top-6", "left-6 bottom-2"].map((pos, i) => (
        <motion.span key={pos} className={`absolute ${pos} z-10 text-[#FF9F0A]`} animate={{ opacity: [0, 1, 0], scale: [0.4, 1.1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.5 }}><IcChispa tam={16} /></motion.span>
      ))}
      <motion.div className="relative z-[1] h-full w-full origin-bottom" {...anim}>
        <Image src="/pareas/pareas.png" alt="Pareas, la iguana de Ponte al Día" fill sizes={`${tam}px`} className="object-contain drop-shadow-[0_8px_12px_rgba(0,40,90,0.25)]" priority={tam > 100} />
      </motion.div>
    </div>
  );
}

export default function Pareas({ humor, mensaje, grande = false, fiesta = false, tam }: { humor: HumorPareas; mensaje?: string; grande?: boolean; fiesta?: boolean; tam?: number }) {
  const t = tam ?? (grande ? 120 : 84);
  return (
    <div className="flex items-end gap-1" aria-label={`Pareas ${humor}`}>
      <Figura humor={humor} tam={t} />
      {mensaje && (
        <motion.div key={mensaje} className="min-w-0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.5 }}>
          <SpeechBubble tono={fiesta ? "fiesta" : humor === "chicotazo" ? "alerta" : "info"}>{mensaje}</SpeechBubble>
        </motion.div>
      )}
    </div>
  );
}
