"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { APP_ENTIDAD, APP_NOMBRE } from "@/lib/config";
import { TextAnimate } from "@/components/ui/text-animate";
import { TextureButton } from "@/components/ui/texture-button";
import { NeumorphEyebrow } from "@/components/ui/neumorph-eyebrow";
import Pacaso from "@/components/Pacaso";

const PASOS = [
  { e: "👀", t: "Mira cuánto debes", d: "Claro y sin letra chica." },
  { e: "🧮", t: "Arma tu plan", d: "Tú eliges cuotas y fecha; el sistema te dice al toque si va." },
  { e: "🦫", t: "El Pacaso te cuida", d: "Suma puntos al día; en mora, chicotazo (con cariño)." },
];

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* fondo animado con los azules de la Caja */}
      <motion.div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_#0072C6_0%,_#00529B_45%,_#00264d_100%)]" />
      {["left-[8%] top-[12%] h-40 w-40 bg-sky-400/30", "right-[6%] top-[38%] h-56 w-56 bg-amber-300/25", "left-[20%] bottom-[6%] h-48 w-48 bg-fuchsia-400/20"].map((c, i) => (
        <motion.div key={c} aria-hidden className={`absolute -z-10 rounded-full blur-3xl ${c}`} animate={{ y: [0, -20, 0], x: [0, 12, 0] }} transition={{ duration: 7 + i * 2, repeat: Infinity, ease: "easeInOut" }} />
      ))}

      <div className="max-w-md mx-auto px-5 pt-10 pb-12 space-y-7 text-white">
        <div className="space-y-3">
          <NeumorphEyebrow intent="primary">{APP_ENTIDAD} · Reto 14</NeumorphEyebrow>
          <TextAnimate text={APP_NOMBRE} type="whipInUp" className="text-5xl font-extrabold tracking-tight" />
          <p className="text-lg text-white/85">Sabes cuánto debes, armas tu plan a tu ritmo y te pones al día, compare. Sin llamadas, sin estrés.</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="rounded-3xl bg-white/10 p-4 backdrop-blur border border-white/20">
          <Pacaso humor="feliz" grande mensaje="¡Habla! Soy el Pacaso. Te acompaño a ponerte al día… y si te atrasas, ¡chas! 😉" />
        </motion.div>

        <div className="grid gap-3">
          <Link href="/cliente" className="block"><TextureButton variant="accent" size="lg" asChild={false}>Entrar como cliente →</TextureButton></Link>
          <Link href="/banco" className="block"><TextureButton variant="secondary" size="lg">Entrar como gestor de la Caja</TextureButton></Link>
        </div>

        <ul className="grid gap-3">
          {PASOS.map((p, i) => (
            <motion.li key={p.t} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.15 }} className="flex gap-3 items-start rounded-2xl bg-white/10 border border-white/15 p-3">
              <span className="text-2xl">{p.e}</span>
              <div><p className="font-bold">{p.t}</p><p className="text-sm text-white/75">{p.d}</p></div>
            </motion.li>
          ))}
        </ul>
        <p className="text-center text-xs text-white/60">Prototipo con datos ficticios · proyecto PAREAS</p>
      </div>
    </main>
  );
}
