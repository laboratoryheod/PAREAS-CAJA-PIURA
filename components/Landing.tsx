"use client";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { MessageCircle, Building2, Wallet, CalendarCheck2, ShieldCheck, Gift, Radio, Sparkles } from "lucide-react";
import { APP_NOMBRE } from "@/lib/config";
import { GradientAnimation } from "@/components/ui/bg-animated-gradient";
import { TextureOverlay } from "@/components/ui/texture-overlay";
import { LightBoard } from "@/components/ui/lightboard";
import { CosmicButton } from "@/components/ui/cosmic-button";
import SquigglyArrow from "@/components/ui/squiggle-arrow";
import { ShiftCard } from "@/components/ui/shift-card";
import { SecurityCheckpoint } from "@/components/ui/security-checkpoint";
import { FamilyButton } from "@/components/ui/family-button";
import { TextureButton } from "@/components/ui/texture-button";
import { NeumorphEyebrow } from "@/components/ui/neumorph-eyebrow";
import { SpeechBubble } from "@/components/ui/speech-bubble";

const SOL_Y_MAR = [
  { stops: [{ color: "#FFE8B0", position: 0 }, { color: "#F6E7C8", position: 40 }, { color: "#FBF4E6", position: 100 }], centerX: 80, centerY: 10 },
  { stops: [{ color: "#FFD27A", position: 0 }, { color: "#F6E7C8", position: 45 }, { color: "#E4F0FB", position: 100 }], centerX: 20, centerY: 30 },
  { stops: [{ color: "#FFF3D6", position: 0 }, { color: "#F6E7C8", position: 35 }, { color: "#D6E8F8", position: 100 }], centerX: 60, centerY: 70 },
];

/** Chips que flotan alrededor de Pareas: lo que pasa dentro del módulo. */
const CHIPS = [
  { t: "S/ 326.08 hoy", c: "left-0 top-6 bg-white text-caja", d: 0 },
  { t: "+15 pts ✅", c: "right-0 top-1/2 bg-emerald-50 text-emerald-700", d: 0.6 },
  { t: "¡CHAS! 💥", c: "left-2 bottom-24 bg-amber-100 text-amber-900", d: 1.2 },
  { t: "🎁 −30% hoy", c: "right-2 bottom-10 bg-fuchsia-50 text-fuchsia-700", d: 1.8 },
];

const ENTRAR = (stagger: number) => ({ initial: { opacity: 0, y: 12, filter: "blur(6px)" }, animate: { opacity: 1, y: 0, filter: "blur(0px)" }, transition: { type: "spring" as const, bounce: 0, duration: 0.7, delay: 0.08 * stagger } });

function Paso({ n, icono, titulo, corto, detalle, color }: { n: string; icono: React.ReactNode; titulo: string; corto: string; detalle: string[]; color: string }) {
  return (
    <ShiftCard
      className={`w-full md:w-full min-h-[260px] bg-white text-caja-texto ${color}`}
      topContent={<div className="flex items-center justify-between px-1"><span className="font-display text-sm font-bold text-caja/60">PASO {n}</span><span className="text-caja">{icono}</span></div>}
      middleContent={<motion.div className="px-2 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}><p className="font-display text-2xl font-extrabold leading-tight text-caja">{titulo}</p><p className="mt-2 text-sm text-neutral-600">{corto}</p></motion.div>}
      bottomContent={
        <div className="rounded-xl bg-caja px-4 pb-4 pt-3 text-white">
          <p className="font-display font-bold">{titulo}</p>
          <ul className="mt-2 space-y-1 text-sm text-white/90">{detalle.map((d) => <li key={d}>• {d}</li>)}</ul>
        </div>
      }
    />
  );
}

export default function Landing() {
  const reducir = useReducedMotion();
  return (
    <main className="relative min-h-screen overflow-x-clip bg-arena-clara text-caja-texto">
      {/* ---------- navegación flotante ---------- */}
      <nav className="fixed inset-x-0 top-3 z-40 flex justify-center px-4">
        <div className="flex w-full max-w-3xl items-center justify-between rounded-full bg-white/75 py-1.5 pl-2 pr-1.5 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,40,90,0.12)] backdrop-blur-md">
          <Link href="/" className="flex items-center gap-2 min-h-[44px]">
            <Image src="/pareas/logo.png" alt="Logo PAREAS" width={36} height={36} className="rounded-xl" />
            <span className="font-display text-lg font-extrabold tracking-tight text-caja">{APP_NOMBRE}</span>
          </Link>
          <Link href="/cliente" className="rounded-full bg-caja px-4 py-2.5 text-sm font-bold text-white active:scale-[0.96] transition-transform min-h-[44px] flex items-center">Entrar</Link>
        </div>
      </nav>

      {/* ---------- hero ---------- */}
      <section className="relative isolate overflow-hidden pt-24 pb-10">
        <div className="absolute inset-0 -z-10">
          <GradientAnimation gradients={SOL_Y_MAR} animationDuration={reducir ? 0 : 14} />
          <TextureOverlay texture="paperGrain" opacity={0.5} />
        </div>
        <div className="mx-auto grid max-w-5xl items-center gap-6 px-5 md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-5">
            <motion.div {...ENTRAR(0)}><NeumorphEyebrow intent="oro">🌞 Hecho en Piura · Caja Piura · Reto 14</NeumorphEyebrow></motion.div>
            <motion.h1 {...ENTRAR(1)} className="font-display text-[44px] font-extrabold leading-[1.02] tracking-[-0.03em] text-caja md:text-7xl">
              Ponte al día<br />con <span className="relative inline-block">Pareas<svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 14" aria-hidden><path d="M2 9 Q 50 2, 100 8 T 198 6" stroke="#F9A825" strokeWidth="5" fill="none" strokeLinecap="round" /></svg></span>
            </motion.h1>
            <motion.p {...ENTRAR(2)} className="max-w-md text-lg leading-relaxed text-neutral-700">
              Sabes cuánto debes, armas tu plan a tu ritmo y te pones al día, compare. Sin colas, sin llamadas y con una iguana que te cuida… <b>y te da su chicotazo si te atrasas</b>.
            </motion.p>
            <motion.div {...ENTRAR(3)} className="relative flex flex-wrap items-center gap-3 pt-1">
              <CosmicButton href="/cliente" target="_self" rel="">Entrar como cliente →</CosmicButton>
              <Link href="/banco" className="min-h-[48px] rounded-[15px] px-4 flex items-center font-semibold text-caja underline-offset-4 hover:underline">Soy gestor de la Caja</Link>

            </motion.div>
            <motion.div {...ENTRAR(4)} className="flex items-center gap-1 text-sm font-semibold text-caja/70">
              <SquigglyArrow width={56} height={30} direction="up" variant="bouncy" className="shrink-0 text-caja-acento" />
              <span>Demo: Gengis Guerrero, 12 días de atraso, cuota de S/ 320.</span>
            </motion.div>
          </div>

          {/* Pareas protagonista con chips flotantes */}
          <motion.div {...ENTRAR(2)} className="relative mx-auto h-[340px] w-full max-w-[380px] md:h-[420px]">
            {/* sol de Piura detrás de Pareas */}
            <motion.div aria-hidden className="absolute inset-[9%] m-auto aspect-square max-h-[82%] rounded-full bg-[radial-gradient(circle,#FFE08A_0%,#FFC24D_45%,rgba(249,168,37,0)_70%)]"
              animate={reducir ? undefined : { scale: [1, 1.06, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
            <motion.div aria-hidden className="absolute inset-0 m-auto aspect-square max-h-full rounded-full bg-[repeating-conic-gradient(rgba(249,168,37,0.22)_0deg_8deg,transparent_8deg_20deg)] [mask-image:radial-gradient(circle,black_45%,transparent_70%)]"
              animate={reducir ? undefined : { rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }} />
            <div className="absolute inset-x-12 bottom-5 h-5 rounded-[50%] bg-caja/25 blur-md" />
            <motion.div className="absolute inset-x-8 bottom-8 top-6" animate={reducir ? undefined : { y: [0, -12, 0], rotate: [0, -1.5, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
              <Image src="/pareas/pareas.png" alt="Pareas, la iguana de la Caja con su bolsa de ahorros" fill priority sizes="380px" className="object-contain drop-shadow-[0_18px_24px_rgba(0,40,90,0.35)]" />
            </motion.div>
            {CHIPS.map((c) => (
              <motion.span key={c.t} className={`absolute z-10 rounded-full px-3 py-1.5 text-sm font-bold shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_6px_16px_rgba(0,40,90,0.15)] tabular-nums ${c.c}`}
                initial={{ opacity: 0, scale: 0.6 }} animate={reducir ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -8, 0] }}
                transition={{ opacity: { delay: 0.6 + c.d / 3 }, scale: { delay: 0.6 + c.d / 3, type: "spring" }, y: { duration: 3 + c.d, repeat: Infinity, ease: "easeInOut", delay: c.d } }}>
                {c.t}
              </motion.span>
            ))}
            <div className="absolute -top-4 right-0 z-20 max-w-[190px] md:-right-6">
              <SpeechBubble>¡Habla! Soy Pareas. Te ayudo a ponerte al día 🦎</SpeechBubble>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------- cartel LED de combi ---------- */}
      <section aria-label="Cartel" className="relative bg-caja-noche py-3">
        <div className="mx-auto max-w-5xl px-3">
          {/* En lightboard, "textDim" pinta la letra y "textBright" el resto de la franja: por eso van invertidos */}
          <LightBoard text="PONTE AL DIA CON PAREAS  SIN COLAS  SIN LLAMADAS" rows={12} lightSize={4} gap={1} updateInterval={90} font="default" disableDrawing
            colors={{ background: "rgba(255,255,255,0.04)", textDim: "#FFC24D", textBright: "rgba(249,168,37,0.10)", drawLine: "#FFC24D" }} />
        </div>
        <div className="mt-2 overflow-hidden">
          <div className="animate-marquesina flex w-max gap-8 whitespace-nowrap text-sm font-semibold text-white/70">
            {[0, 1].map((k) => (
              <div key={k} className="flex gap-8">
                <span>🦎 Pareas te avisa antes de cada fecha</span><span>💳 Paga con QR o que pague un familiar</span><span>🎮 Trivia diaria: suma puntos</span><span>🎁 Campañas de la Caja para regularizarte</span><span>🔒 Nunca te pedimos tu clave</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- cómo funciona: shift cards ---------- */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-caja md:text-4xl">Así de fácil, compare</h2>
        <p className="mt-1 text-neutral-600">Toca cada tarjeta para ver el detalle.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Paso n="1" icono={<Wallet className="h-6 w-6" />} titulo="Mira cuánto debes" corto="Claro, en soles y sin letra chica." color=""
            detalle={["Cuota vencida + interés del día", "Días de atraso", "Tus puntos y tu nivel"]} />
          <Paso n="2" icono={<CalendarCheck2 className="h-6 w-6" />} titulo="Arma tu plan" corto="Tú eliges cuotas, inicial y fecha." color=""
            detalle={["Validado al toque con las reglas", "Si no va, te damos la alternativa más cercana", "Arranca con tu primer pago"]} />
          <Paso n="3" icono={<Sparkles className="h-6 w-6" />} titulo="Pareas te cuida" corto="Puntos al día, chicotazo en mora." color=""
            detalle={["Pagar a tiempo: +15", "Trivia diaria: hasta +10", "En mora: −12 por día (con cariño)"]} />
        </div>
      </section>

      {/* ---------- niveles + regalo ---------- */}
      <section className="bg-white py-14">
        <div className="mx-auto grid max-w-5xl gap-6 px-5 md:grid-cols-2">
          <div className="space-y-3">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-caja">Sube de nivel, gana beneficios</h2>
            <div className="flex flex-wrap gap-2"><NeumorphEyebrow intent="bronce">Bronce · &lt;50</NeumorphEyebrow><NeumorphEyebrow intent="plata">Plata · 50–74</NeumorphEyebrow><NeumorphEyebrow intent="oro">Oro · 75+</NeumorphEyebrow></div>
            <p className="text-neutral-700">En Oro tienes una cuota extra y menos inicial para reprogramar. Si se te pasa un pago de tu plan, Pareas te deja sin beneficios… hasta que la Caja te dé una mano.</p>
          </div>
          <motion.div whileHover={{ rotate: -1, scale: 1.01 }} transition={{ type: "spring", bounce: 0 }} className="rounded-[28px] bg-gradient-to-br from-fuchsia-700 via-rose-600 to-orange-500 p-5 text-white shadow-[0_18px_40px_rgba(190,24,93,0.35)]">
            <div className="flex items-center gap-3"><Gift className="h-9 w-9" /><p className="font-display text-2xl font-extrabold">Regalo Salvador</p></div>
            <p className="mt-2 text-white/90">Campaña que activa tu gestor: pagas hoy <b>30% menos</b> y lo recuperas con +10% en tus 3 cuotas siguientes.</p>
            <p className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">Solo con tu gestor de la Caja</p>
          </motion.div>
        </div>
      </section>

      {/* ---------- seguridad ---------- */}
      <section className="mx-auto grid max-w-5xl items-center gap-6 px-5 py-14 md:grid-cols-2">
        <div className="space-y-3">
          <ShieldCheck className="h-9 w-9 text-caja" />
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-caja">Tu plata, protegida</h2>
          <ul className="space-y-2 text-neutral-700">
            <li>🔒 Pareas nunca te pide claves, tarjeta ni token.</li>
            <li>🪪 Tu DNI se guarda cifrado y en pantalla siempre aparece enmascarado.</li>
            <li>📱 Se integra a la app de Caja Piura: mismo ingreso y seguridad.</li>
          </ul>
        </div>
        <div className="flex justify-center">
          <SecurityCheckpoint title="Pareas" subtitle="Verificación segura" message="Nunca te vamos a pedir tu clave, tu tarjeta ni tu token. Si alguien lo hace, no es la Caja." />
        </div>
      </section>

      {/* ---------- para la Caja ---------- */}
      <section className="bg-caja-noche py-14 text-white">
        <div className="mx-auto max-w-5xl space-y-6 px-5">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">Y para el gestor de la Caja</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {[{ i: <Radio className="h-6 w-6" />, t: "En tiempo real", d: "Quién abrió, simuló y aceptó un plan, segundo a segundo." }, { i: <Building2 className="h-6 w-6" />, t: "Casos derivados", d: "Más de 60 días, incumplidos o quien pide hablar con una persona." }, { i: <Gift className="h-6 w-6" />, t: "Regalo Salvador", d: "Activa la campaña de regularización con un clic." }].map((x) => (
              <div key={x.t} className="rounded-2xl bg-white/5 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"><span className="text-caja-acento">{x.i}</span><p className="mt-2 font-display text-lg font-bold">{x.t}</p><p className="text-sm text-white/70">{x.d}</p></div>
            ))}
          </div>
          <div className="max-w-xs"><Link href="/banco" className="block"><TextureButton variant="accent" size="lg">Abrir panel del gestor</TextureButton></Link></div>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-2 py-10 pb-28 text-center text-sm text-neutral-500">
        <Image src="/pareas/logo.png" alt="" width={56} height={56} className="rounded-2xl" />
        <p className="font-display font-bold text-caja">PAREAS</p>
        <p>Prototipo con datos ficticios para el Reto 14 de Caja Piura.</p>
      </footer>

      {/* ---------- botón flotante (family-button de cult-ui) ---------- */}
      <div className="fixed bottom-5 right-4 z-50">
        <FamilyButton etiqueta="Accesos rápidos">
          <div className="flex h-full flex-col items-stretch gap-2 p-3 pt-4">
            <p className="px-1 font-display text-sm font-bold text-white/80">¿A dónde vamos?</p>
            <Link href="/cliente" className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white/15 px-3 font-semibold hover:bg-white/25"><Wallet className="h-5 w-5" />Ver mi deuda</Link>
            <Link href="/cliente?ver=asistente" className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white/15 px-3 font-semibold hover:bg-white/25"><MessageCircle className="h-5 w-5" />Hablar con Pareas</Link>
            <Link href="/banco" className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white/15 px-3 font-semibold hover:bg-white/25"><Building2 className="h-5 w-5" />Soy gestor</Link>
          </div>
        </FamilyButton>
      </div>
    </main>
  );
}
