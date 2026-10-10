"use client";
// Mascota. Hoy es un emoji animado; para reemplazarla por la ilustración basta con cambiar el contenido de <Cara />.
import { motion } from "motion/react";
import { SpeechBubble } from "@/components/ui/speech-bubble";

export type HumorPacaso = "feliz" | "serio" | "chicotazo";

function Cara({ humor, grande }: { humor: HumorPacaso; grande: boolean }) {
  const tam = grande ? "text-7xl" : "text-5xl";
  if (humor === "chicotazo") {
    return (
      <div className={`relative ${tam} leading-none select-none`}>
        <motion.span className="inline-block origin-bottom" animate={{ rotate: [0, -16, 14, -10, 6, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 2.2 }}>🦫</motion.span>
        {/* el látigo: aparece y "chasquea" en cada golpe */}
        <motion.span className="absolute -right-5 -top-2 text-3xl" animate={{ scale: [0, 1.4, 1, 0], rotate: [0, 25, -10, 0], opacity: [0, 1, 1, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 2.2 }}>💥</motion.span>
        <motion.span className="absolute -left-3 top-1 text-xl" animate={{ x: [0, -6, 0], opacity: [0, 1, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 2.2, delay: 0.15 }}>〰️</motion.span>
      </div>
    );
  }
  if (humor === "feliz") {
    return (
      <div className={`relative ${tam} leading-none select-none`}>
        <motion.span className="inline-block" animate={{ y: [0, -8, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>🦫</motion.span>
        <motion.span className="absolute -right-4 -top-2 text-xl" animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity }}>✨</motion.span>
      </div>
    );
  }
  return (
    <div className={`relative ${tam} leading-none select-none`}>
      <motion.span className="inline-block" animate={{ rotate: [0, 4, 0, -4, 0] }} transition={{ duration: 3, repeat: Infinity }}>🦫</motion.span>
      <span className="absolute -right-3 -top-1 text-lg">👀</span>
    </div>
  );
}

export default function Pacaso({ humor, mensaje, grande = false, fiesta = false }: { humor: HumorPacaso; mensaje?: string; grande?: boolean; fiesta?: boolean }) {
  return (
    <div className="flex items-end gap-1" aria-label={`Pacaso ${humor}`}>
      <div className="shrink-0 pb-1"><Cara humor={humor} grande={grande} /></div>
      {mensaje && (
        <motion.div key={mensaje} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", damping: 16, stiffness: 180 }}>
          <SpeechBubble tono={fiesta ? "fiesta" : humor === "chicotazo" ? "alerta" : "info"}>{mensaje.replace(/^🦫\s*/, "")}</SpeechBubble>
        </motion.div>
      )}
    </div>
  );
}
