"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { api, type Situacion } from "@/lib/cliente-api";
import { Dock, DockCard } from "@/components/ui/dock";
import { FamilyButton } from "@/components/ui/family-button";
import { IcInicio, IcTarjeta, IcCalculadora, IcCalendario, IcMando, IcBurbuja, IcGestor, IcQR, IcReloj } from "@/components/iconos";
import Simulador, { type PlanElegido } from "./Simulador";
import Confirmar from "./Confirmar";
import Pagar from "./Pagar";
import Plan from "./Plan";
import Trivia from "./Trivia";
import Asistente from "./Asistente";
import { Inicio } from "./inicio/Inicio";
import { Bienvenida } from "./inicio/Bienvenida";
import type { ProgresoTrivia } from "./inicio/Widgets";

type Vista = "inicio" | "simulador" | "confirmar" | "plan" | "pagar" | "trivia" | "asistente";
export type { Vista };

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export default function Dashboard({ clienteId, vistaInicial = "inicio" }: { clienteId: number; vistaInicial?: Vista }) {
  const [sit, setSit] = useState<Situacion | null>(null);
  const [progreso, setProgreso] = useState<ProgresoTrivia | null>(null);
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [plan, setPlan] = useState<{ plan: PlanElegido; resultado: string; total: number } | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const refrescar = useCallback(async () => {
    const [s, t] = await Promise.all([api<Situacion>(`/api/cliente/${clienteId}`), api<{ progreso: ProgresoTrivia }>(`/api/trivia?clienteId=${clienteId}`)]);
    setSit(s); setProgreso(t.progreso); return s;
  }, [clienteId]);
  useEffect(() => {
    api<Situacion>(`/api/cliente/${clienteId}?abrir=1`).then(setSit).catch((e) => setError(e.message));
    api<{ progreso: ProgresoTrivia }>(`/api/trivia?clienteId=${clienteId}`).then((t) => setProgreso(t.progreso)).catch(() => {});
  }, [clienteId]);
  // Si el gestor otorga un regalo mientras el cliente mira, aparece solo
  useEffect(() => { if (vista !== "inicio") return; const t = setInterval(() => { refrescar().catch(() => {}); }, 5000); return () => clearInterval(t); }, [vista, refrescar]);

  if (error) return <main className="mx-auto max-w-md p-6"><p className="card text-red-700">{error}</p><Link href="/" className="text-[#0A84FF] underline">Volver al inicio</Link></main>;
  if (!sit) return (
    <main className="grid min-h-screen place-items-center bg-[#F2F2F7]">
      <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="relative h-24 w-24"><Image src="/pareas/pareas.png" alt="Cargando" fill sizes="96px" className="object-contain" /></motion.div>
    </main>
  );

  const volver = () => { setVista("inicio"); refrescar(); };
  const irA = (v: Vista) => { if (v === "inicio") volver(); else setVista(v); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const hayDeuda = sit.deuda.total > 0;
  const puedeArmar = !!sit.limites && hayDeuda && !sit.propuestaDerivada && !sit.propuestaActiva && !sit.regalo;
  const tienePlan = !!(sit.propuestaActiva || sit.propuestaDerivada);
  const [y, m, d] = sit.fechaDemo.split("-").map(Number);
  const dia = DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];

  async function pedirGestor() {
    try { const r = await api<{ mensaje: string }>("/api/ayuda", { clienteId, nota: "Pidió ayuda desde el botón flotante" }); setAviso(r.mensaje); }
    catch (e: any) { setAviso(e.message); }
    setTimeout(() => setAviso(""), 5000);
  }

  const ITEMS: { v: Vista; e: string; I: typeof IcInicio; ok: boolean }[] = [
    { v: "inicio", e: "Inicio", I: IcInicio, ok: true },
    { v: "pagar", e: "Pagar", I: IcTarjeta, ok: hayDeuda || !!sit.propuestaActiva },
    tienePlan ? { v: "plan", e: "Mi plan", I: IcCalendario, ok: true } : { v: "simulador", e: "Mi plan", I: IcCalculadora, ok: puedeArmar },
    { v: "trivia", e: "Juego", I: IcMando, ok: true },
    { v: "asistente", e: "Pareas", I: IcBurbuja, ok: true },
  ];

  return (
    <main className="min-h-screen bg-[#F2F2F7] pb-36 text-[#1C1C1E]">
      {/* barra superior translúcida estilo iOS */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#F2F2F7]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
          <Link href="/" className="flex min-h-[44px] items-center gap-2 text-[17px] font-semibold tracking-[-0.01em]">
            <Image src="/pareas/logo.png" alt="" width={30} height={30} className="rounded-[8px]" />Ponte al Día
          </Link>
          <Link href="/" className="min-h-[44px] flex items-center text-[17px] text-[#0A84FF]">Salir</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={vista} initial={{ opacity: 0, y: 10, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8, filter: "blur(4px)" }} transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
            {vista === "inicio" ? (
              <>
                <div className="mb-3">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-500">{dia} {sit.fechaDemoLarga}</p>
                  <h1 className="text-[34px] font-bold leading-tight tracking-[-0.03em]">Hola, {sit.cliente.nombre}</h1>
                </div>
                <Inicio sit={sit} progreso={progreso} ir={(v) => irA(v)} />

                <div className="mt-6 overflow-hidden rounded-[20px] bg-white text-[15px] shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
                  <p className="px-4 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-neutral-500">Demo · {sit.fechaDemoLarga}</p>
                  <button className="flex min-h-[48px] w-full items-center gap-3 px-4 text-left hover:bg-black/[0.03]" onClick={async () => { await api("/api/demo/avanzar-dia", {}); refrescar(); }}><IcReloj tam={20} className="text-[#0A84FF]" />Pasar un día</button>
                  <button className="flex min-h-[48px] w-full items-center gap-3 border-t border-black/5 px-4 text-left text-[#FF3B30] hover:bg-black/[0.03]" onClick={async () => { await api("/api/demo/reset", {}); try { localStorage.removeItem(`pareas-bienvenida-${clienteId}`); } catch {} location.reload(); }}>Reiniciar demo</button>
                </div>
              </>
            ) : (
              <div className="mx-auto max-w-xl space-y-4">
                {vista === "simulador" && puedeArmar && <Simulador sit={sit} onVolver={volver} onContinuar={(p, r, t) => { setPlan({ plan: p, resultado: r, total: t }); setVista("confirmar"); }} />}
                {vista === "confirmar" && plan && <Confirmar sit={sit} plan={plan.plan} resultado={plan.resultado} total={plan.total} onVolver={() => setVista("simulador")} onListo={(s) => { setSit(s); setVista("plan"); }} />}
                {vista === "plan" && <Plan sit={sit} onVolver={volver} onPagar={() => setVista("pagar")} />}
                {vista === "pagar" && <Pagar sit={sit} onPagado={setSit} onVolver={volver} />}
                {vista === "trivia" && <Trivia sit={sit} onScore={setSit} onVolver={volver} />}
                {vista === "asistente" && <Asistente sit={sit} onVolver={volver} />}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Bienvenida clienteId={clienteId} nombre={sit.cliente.nombre} />

      <AnimatePresence>
        {aviso && <motion.p initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="fixed inset-x-4 top-16 z-50 mx-auto max-w-md rounded-[20px] bg-black/85 p-3 text-center text-[15px] font-medium text-white backdrop-blur">{aviso}</motion.p>}
      </AnimatePresence>

      {/* Botón flotante de ayuda rápida (family-button de cult-ui) */}
      <div className="fixed bottom-[104px] right-3 z-40 md:right-[max(12px,calc(50%-500px))]">
        <FamilyButton etiqueta="Ayuda rápida">
          <div className="flex h-full flex-col items-stretch gap-2 p-3 pt-4">
            <p className="px-1 text-[13px] font-semibold text-white/80">¿Te ayudo?</p>
            <button onClick={() => irA("asistente")} className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white/15 px-3 text-left text-[14px] font-semibold hover:bg-white/25"><IcBurbuja tam={18} />Habla con Pareas</button>
            <button onClick={pedirGestor} className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white/15 px-3 text-left text-[14px] font-semibold hover:bg-white/25"><IcGestor tam={18} />Llamar a mi gestor</button>
            {(hayDeuda || sit.propuestaActiva) && <button onClick={() => irA("pagar")} className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white/15 px-3 text-left text-[14px] font-semibold hover:bg-white/25"><IcQR tam={18} />QR para un familiar</button>}
          </div>
        </FamilyButton>
      </div>

      {/* Barra de pestañas flotante (dock de cult-ui) */}
      <nav aria-label="Secciones">
        <Dock className="fixed bottom-3 left-1/2 h-auto items-end gap-2 rounded-[26px] bg-white/75 px-2.5 pb-1.5 pt-2 backdrop-blur-xl hover:bg-white/85">
          {ITEMS.filter((x) => x.ok).map((x, i) => (
            <DockCard key={x.e} id={String(i)} etiqueta={x.e} activo={vista === x.v || (x.v === "simulador" && vista === "confirmar")} onClick={() => irA(x.v)}>
              <span className="flex h-full w-full items-center justify-center"><x.I tam={22} /></span>
            </DockCard>
          ))}
        </Dock>
      </nav>
    </main>
  );
}
