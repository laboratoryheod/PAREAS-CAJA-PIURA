"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { HaloSegmented } from "@/components/ui/halo-segmented";
import { RollingNumber } from "@/components/ui/rolling-number";
import { TarjetaChicotazo } from "@/components/cliente/inicio/Chicotazo";
import { AnilloScore } from "@/components/cliente/inicio/AnilloScore";
import { PantallaCliente, PantallaGestor, IslaChicotazo } from "@/components/landing/Pantallas";
import { FichaApp, IcBurbuja, IcCalendario, IcEscudo, IcBillete, IcBilletera, IcEnVivo, IcFlecha, IcMando, IcCandado, IcGestor, IcCaja } from "@/components/iconos";
import { cn } from "@/lib/utils";
import { APP_NOMBRE } from "@/lib/config";

// Los mockups de iPhone y Mac son pesados: se descargan aparte, con un marcador del mismo tamaño (sin saltos)
const IPhone17ProMax = dynamic(() => import("@/components/ui/apple-iphone-17-pro").then((m) => m.IPhone17ProMax), {
  ssr: false,
  loading: () => <div className="h-[min(620px,76vh)] w-[min(300px,70vw)] animate-pulse rounded-[54px] bg-neutral-200/70" aria-hidden />,
});
const BrowserWindow = dynamic(() => import("@/components/ui/mock-browser-window").then((m) => m.BrowserWindow), {
  ssr: false,
  loading: () => <div className="aspect-[16/10] w-full animate-pulse rounded-[18px] bg-neutral-200/70" aria-hidden />,
});

// Solo opacidad y transform: animaciones de compositor, a 60 fps y sin repintar
const ENTRA = (k: number) => ({ initial: { opacity: 0, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { type: "spring" as const, bounce: 0, duration: 0.8, delay: 0.08 * k } });
const CHICOTAZO_DEMO = { activo: true, porDia: -12 as const, diasEnMora: 12, golpes: 2, puntosPerdidos: -24, topeTriviaDia: 10 as const };

// ---------------------------------------------------------------- isla de navegación (flotante arriba)
function IslaNav() {
  const [abierta, setAbierta] = useState(false);
  const enlaces = [["#como", "Cómo funciona"], ["#chicotazo", "CHICOTAZO"], ["#gestor", "Para la Caja"], ["#seguridad", "Seguridad"]];
  return (
    <div className="fixed inset-x-0 top-3 z-50 flex justify-center px-3" onMouseLeave={() => setAbierta(false)}>
      <motion.nav layout onMouseEnter={() => setAbierta(true)} className="overflow-hidden bg-[#00529B]/95 text-white shadow-[0_12px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl"
        style={{ borderRadius: 28 }} transition={{ type: "spring", bounce: 0.18, duration: 0.55 }} aria-label="Principal">
        <motion.div layout className="flex items-center gap-3 py-1.5 pl-1.5 pr-1.5">
          <button onClick={() => setAbierta((x) => !x)} aria-expanded={abierta} className="flex min-h-[40px] items-center gap-2 rounded-full pr-2">
            <span className="relative h-9 w-9 overflow-hidden rounded-full bg-white"><Image src="/pareas/logo.png" alt="" fill sizes="36px" className="object-cover" priority /></span>
            <span className="text-[15px] font-semibold tracking-[0.02em]">{APP_NOMBRE}</span>
            <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white"><motion.span className="h-1.5 w-1.5 rounded-full bg-[#FF453A]" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />En vivo</span>
          </button>
          <Link href="/cliente" className="flex min-h-[40px] items-center rounded-full bg-[#F9A825] text-[#1A1A1A] px-4 text-[14px] font-semibold active:scale-[0.96] transition-transform">Entrar</Link>
        </motion.div>
        <AnimatePresence initial={false}>
          {abierta && (
            <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-1 px-2 pb-2 sm:flex">
              {enlaces.map(([h, t]) => <a key={h} href={h} onClick={() => setAbierta(false)} className="flex min-h-[40px] items-center justify-center rounded-full px-3 text-[13px] font-medium text-white/80 hover:bg-white/10 hover:text-white">{t}</a>)}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}

// ---------------------------------------------------------------- barra flotante abajo (aparece al bajar)
function BarraFlotante({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-3" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}>
          <div className="flex w-full max-w-lg items-center gap-2 rounded-[26px] bg-white/80 p-2 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,30,80,0.18)] backdrop-blur-xl">
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[12px] bg-[#EEF4FF]"><Image src="/pareas/pareas.png" alt="" fill sizes="44px" className="object-contain p-0.5" /></span>
            <div className="hidden min-w-0 flex-1 sm:block"><p className="text-[14px] font-semibold leading-tight">Ponte al día hoy</p><p className="truncate text-[12px] text-neutral-500">Sin colas, sin llamadas, con Pareas</p></div>
            <Link href="/banco" className="ml-auto flex min-h-[44px] items-center rounded-full bg-neutral-100 px-4 text-[14px] font-semibold text-neutral-800 active:scale-[0.96] transition-transform">Soy gestor</Link>
            <Link href="/cliente" className="flex min-h-[44px] items-center gap-1 rounded-full bg-[#F9A825] px-4 text-[14px] font-semibold text-[#1A1A1A] active:scale-[0.96] transition-transform">Soy cliente<IcFlecha tam={16} /></Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------- tarjetas bento
function Bento({ className, children, oscuro }: { className?: string; children: React.ReactNode; oscuro?: boolean }) {
  return (
    <motion.div {...ENTRA(0)} className={cn("relative overflow-hidden rounded-[30px] p-6", oscuro ? "bg-[#111317] text-white" : "bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_10px_30px_rgba(0,30,80,0.05)]", className)}>
      {children}
    </motion.div>
  );
}

export default function Landing() {
  const reducir = useReducedMotion();
  const [vista, setVista] = useState("cliente");
  const [barra, setBarra] = useState(false);
  const hero = useRef<HTMLDivElement>(null);
  const [isla, setIsla] = useState<"default" | "expanded">("default");

  // La barra inferior aparece cuando el hero sale de pantalla (IntersectionObserver, sin escuchar scroll)
  useEffect(() => {
    const el = hero.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setBarra(!e.isIntersecting), { threshold: 0.15 });
    io.observe(el); return () => io.disconnect();
  }, []);
  // La Dynamic Island del iPhone "recibe" el CHICOTAZO cada pocos segundos
  useEffect(() => {
    if (reducir) { setIsla("expanded"); return; }
    let t: ReturnType<typeof setTimeout>;
    const ciclo = (abierta: boolean) => { setIsla(abierta ? "expanded" : "default"); t = setTimeout(() => ciclo(!abierta), abierta ? 3200 : 1800); };
    t = setTimeout(() => ciclo(true), 1200);
    return () => clearTimeout(t);
  }, [reducir]);

  return (
    <main className="min-h-screen overflow-x-clip text-[#1D1D1F]">
      <IslaNav />

      {/* ---------- hero ---------- */}
      <section ref={hero} className="relative px-5 pb-10 pt-28 text-center md:pt-32">
        <motion.p {...ENTRA(0)} className="text-[15px] font-semibold text-[#00529B]">Nuevo · Caja Piura</motion.p>
        <motion.h1 {...ENTRA(1)} className="mx-auto mt-2 max-w-4xl text-[48px] font-semibold leading-[1.04] tracking-[-0.045em] md:text-[84px]">
          Ponte al día.<br /><span className="bg-gradient-to-r from-[#0047AB] via-[#0072C6] to-[#F9A825] bg-clip-text text-transparent">Con Pareas.</span>
        </motion.h1>
        <motion.p {...ENTRA(2)} className="mx-auto mt-4 max-w-xl text-[19px] leading-relaxed text-[#6E6E73] md:text-[21px]">
          Su deuda clara, sus finanzas en orden y un juego que premia la puntualidad. Y si hay atraso, el CHICOTAZO.
        </motion.p>
        <motion.div {...ENTRA(3)} className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link href="/cliente" className="flex min-h-[48px] items-center rounded-full bg-[#F9A825] px-6 text-[17px] font-semibold text-[#1A1A1A] transition-transform active:scale-[0.96] hover:bg-[#FFB733]">Entrar como cliente</Link>
          <Link href="/banco" className="flex min-h-[48px] items-center gap-1 text-[17px] text-[#0047AB] hover:underline">Ver panel del gestor<IcFlecha tam={16} /></Link>
        </motion.div>

        {/* escenario de dispositivos */}
        <motion.div {...ENTRA(4)} className="mt-10 flex flex-col items-center">
          <HaloSegmented className="mb-6" value={vista} onValueChange={setVista} items={[{ value: "cliente", label: "Cliente" }, { value: "gestor", label: "Gestor" }]} />
          <div className="relative flex min-h-[560px] w-full max-w-5xl items-center justify-center md:min-h-[640px]">
            <AnimatePresence mode="wait" initial={false}>
              {vista === "cliente" ? (
                <motion.div key="cel" className="relative flex items-end justify-center" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", bounce: 0, duration: 0.6 }}>
                  <motion.div className="absolute -left-40 bottom-6 hidden h-64 w-64 md:block" animate={reducir ? undefined : { y: [0, -10, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}>
                    <Image src="/pareas/pareas.png" alt="Pareas, la iguana de la Caja" fill sizes="256px" className="object-contain drop-shadow-[0_24px_30px_rgba(0,30,80,0.25)]" priority />
                  </motion.div>
                  <IPhone17ProMax alto="min(620px, 76vh)" frameColor="blue" time="9:41" batteryLevel={86} dynamicIslandSize={isla} onDynamicIslandTap={() => setIsla((x) => (x === "default" ? "expanded" : "default"))} dynamicIslandContent={<IslaChicotazo />}>
                    <PantallaCliente />
                  </IPhone17ProMax>
                </motion.div>
              ) : (
                <motion.div key="mac" className="w-full max-w-4xl" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", bounce: 0, duration: 0.6 }}>
                  <BrowserWindow variant="safari" headerStyle="full" size="xl" url="caja-piura.pe/ponte-al-dia/gestor" className="w-full bg-white text-left">
                    <PantallaGestor />
                  </BrowserWindow>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      {/* ---------- bento: todo en una pantalla ---------- */}
      <section id="como" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16">
        <motion.h2 {...ENTRA(0)} className="text-[40px] font-semibold leading-tight tracking-[-0.04em] md:text-[56px]">Todo en una pantalla.<br /><span className="text-[#86868B]">Como un juego.</span></motion.h2>
        <div className="mt-8 grid gap-4 md:grid-cols-6">
          <Bento className="md:col-span-4" oscuro>
            <div id="chicotazo" className="scroll-mt-28 grid items-center gap-6 md:grid-cols-[1fr_1.1fr]">
              <div>
                <p className="text-[15px] font-semibold text-[#FF453A]">La regla de oro de Pareas</p>
                <h3 className="mt-1 text-[34px] font-semibold leading-tight tracking-[-0.035em]">El CHICOTAZO.</h3>
                <p className="mt-2 text-[17px] text-white/70">Cada día en mora, Pareas resta 12 puntos. Ni acertando toda la trivia se compensa. Solo al pagar, guarda el látigo.</p>
              </div>
              <TarjetaChicotazo ch={CHICOTAZO_DEMO} />
            </div>
          </Bento>
          <Bento className="md:col-span-2">
            <FichaApp icono={IcMando} color="violeta" tam={48} />
            <h3 className="mt-4 text-[24px] font-semibold tracking-[-0.03em]">Score de 0 a 100</h3>
            <p className="mt-1 text-[15px] text-[#6E6E73]">Bronce, Plata u Oro. La trivia y los pagos a tiempo suman.</p>
            <div className="mt-4 flex justify-center"><AnilloScore score={82} nivel="Oro" trivia={8} topeTrivia={10} mora={false} /></div>
          </Bento>
          <Bento className="md:col-span-2">
            <FichaApp icono={IcCalendario} color="rojo" tam={48} />
            <h3 className="mt-4 text-[24px] font-semibold tracking-[-0.03em]">Su calendario</h3>
            <p className="mt-1 text-[15px] text-[#6E6E73]">Cuotas vencidas, próximos pagos, recargos y vencimiento de campañas, día por día.</p>
          </Bento>
          <Bento className="md:col-span-2">
            <FichaApp icono={IcBilletera} color="verde" tam={48} />
            <h3 className="mt-4 text-[24px] font-semibold tracking-[-0.03em]">Mis Finanzas</h3>
            <p className="mt-1 text-[15px] text-[#6E6E73]">Anote lo que gana y lo que gasta: le decimos cuánto le sobra después de su cuota y le damos consejos.</p>
          </Bento>
          <Bento className="md:col-span-2 bg-gradient-to-br from-[#0072C6] via-[#0047AB] to-[#00347A] text-white !shadow-none">
            <FichaApp icono={IcBillete} color="rescate" tam={48} className="ring-2 ring-white/30" />
            <h3 className="mt-4 text-[24px] font-semibold tracking-[-0.03em]">Modo Rescate</h3>
            <p className="mt-1 text-[15px] text-white/85">La Caja le brinda una facilidad: paga hoy 30% menos y lo recupera en 3 cuotas.</p>
          </Bento>
          <Bento className="md:col-span-3">
            <FichaApp icono={IcBurbuja} color="cielo" tam={48} />
            <h3 className="mt-4 text-[24px] font-semibold tracking-[-0.03em]">Pareas, su asistente</h3>
            <p className="mt-1 text-[15px] text-[#6E6E73]">Responde sobre su deuda, sus finanzas y la Caja. Solo eso: así es rápido, seguro y preciso.</p>
            <div className="mt-4 space-y-2 text-[14px]">
              <p className="ml-auto w-fit rounded-[18px] rounded-br-[6px] bg-[#0072C6] px-3 py-2 text-white">¿Cuánto debo hoy?</p>
              <p className="w-fit max-w-[85%] rounded-[18px] rounded-bl-[6px] bg-[#E9E9EB] px-3 py-2">Hoy su deuda es de S/ 326.08. ¿Desea pasarla a cuotas?</p>
            </div>
          </Bento>
          <Bento className="md:col-span-3">
            <div id="seguridad" className="scroll-mt-28">
              <FichaApp icono={IcEscudo} color="verde" tam={48} />
              <h3 className="mt-4 text-[24px] font-semibold tracking-[-0.03em]">Su dinero, protegido</h3>
              <ul className="mt-2 space-y-2 text-[15px] text-[#6E6E73]">
                <li className="flex items-start gap-2"><IcCandado tam={18} className="mt-0.5 text-[#1DA851]" />Pareas nunca le pedirá claves, tarjeta ni token.</li>
                <li className="flex items-start gap-2"><IcEscudo tam={18} className="mt-0.5 text-[#1DA851]" />Su DNI se guarda cifrado y siempre se muestra enmascarado.</li>
                <li className="flex items-start gap-2"><IcCaja tam={18} className="mt-0.5 text-[#1DA851]" />Se integra a la app de Caja Piura: mismo ingreso y seguridad.</li>
              </ul>
            </div>
          </Bento>
        </div>
      </section>

      {/* ---------- para la Caja ---------- */}
      <section id="gestor" className="scroll-mt-24 bg-[#071A33] py-20 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <motion.h2 {...ENTRA(0)} className="text-[40px] font-semibold leading-tight tracking-[-0.04em] md:text-[56px]">Para la Caja,<br /><span className="text-[#86868B]">todo en tiempo real.</span></motion.h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[{ v: 100, s: "", e: "avisos enviados", I: IcEnVivo, c: "rojo" as const }, { v: 36, s: "%", e: "abrieron el módulo", I: IcCalendario, c: "azul" as const }, { v: 13, s: "", e: "pagos registrados hoy", I: IcGestor, c: "verde" as const }].map((k, i) => (
              <motion.div key={k.e} {...ENTRA(i)} className="rounded-[26px] bg-white/[0.06] p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                <FichaApp icono={k.I} color={k.c} tam={40} />
                <p className="mt-4 text-[56px] font-semibold leading-none tracking-[-0.05em] tabular-nums"><RollingNumber value={k.v} />{k.s}</p>
                <p className="mt-1 text-[17px] text-white/60">{k.e}</p>
              </motion.div>
            ))}
          </div>
          <motion.div {...ENTRA(1)} className="mt-8"><Link href="/banco" className="inline-flex min-h-[48px] items-center gap-1 rounded-full bg-white px-6 text-[17px] font-medium text-black active:scale-[0.96] transition-transform">Abrir panel del gestor<IcFlecha tam={16} /></Link></motion.div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 pb-32 pt-12 text-center text-[12px] text-[#86868B]">
        <Image src="/pareas/logo.png" alt="Logo PAREAS" width={48} height={48} className="rounded-[12px]" />
        <p className="text-[14px] font-semibold text-[#1D1D1F]">PAREAS</p>
        <p>{APP_NOMBRE} · Caja Piura</p>
      </footer>

      <BarraFlotante visible={barra} />
    </main>
  );
}
