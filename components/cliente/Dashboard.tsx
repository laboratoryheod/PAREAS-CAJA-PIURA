"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { api, type Situacion } from "@/lib/cliente-api";
import { usarPolling } from "@/lib/usar-polling";
import { MOSTRAR_HERRAMIENTAS_PRUEBA } from "@/lib/config";
import BotonReinicio, { reiniciarTodo } from "@/components/BotonReinicio";
import { Dock, DockCard } from "@/components/ui/dock";
import { IcInicio, IcTarjeta, IcBilletera, IcMando, IcBurbuja, IcReloj, IcReiniciar } from "@/components/iconos";
import { APP_NOMBRE } from "@/lib/config";
import { BurbujaChat, usarConversacion } from "./ChatPareas";
import dynamic from "next/dynamic";
import { Inicio } from "./inicio/Inicio";
import { PantallaCarga } from "@/components/PantallaCarga";
import { Notificaciones } from "./Notificaciones";
import { Bienvenida } from "./inicio/Bienvenida";
import type { ProgresoTrivia } from "./inicio/Widgets";

// Vistas secundarias: se descargan solo cuando el cliente navega a ellas (code splitting)
const Cargando = () => <PantallaCarga compacta />;
const Pagar = dynamic(() => import("./Pagar"), { ssr: false, loading: Cargando });
const Finanzas = dynamic(() => import("./Finanzas"), { ssr: false, loading: Cargando });
const Trivia = dynamic(() => import("./Trivia"), { ssr: false, loading: Cargando });
const Asistente = dynamic(() => import("./Asistente"), { ssr: false, loading: Cargando });

const POLL_MS = 5000;

type Vista = "inicio" | "finanzas" | "pagar" | "trivia" | "asistente";
export type { Vista };

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export default function Dashboard({ clienteId, vistaInicial = "inicio", inicial }: { clienteId: number; vistaInicial?: Vista; inicial: { sit: Situacion; progreso: ProgresoTrivia } }) {
  const [sit, setSit] = useState<Situacion | null>(inicial.sit);
  const [progreso, setProgreso] = useState<ProgresoTrivia | null>(inicial.progreso);
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [error, setError] = useState("");
  const [chatAbierto, setChatAbierto] = useState(false);
  const chat = usarConversacion(inicial.sit);

  const refrescarSituacion = useCallback(async () => { const s = await api<Situacion>(`/api/cliente/${clienteId}`); setSit(s); return s; }, [clienteId]);
  const refrescarTrivia = useCallback(async () => { const t = await api<{ progreso: ProgresoTrivia }>(`/api/trivia?clienteId=${clienteId}`); setProgreso(t.progreso); }, [clienteId]);
  // Refresco completo (situación + trivia): solo al volver al inicio o tras una acción, no en el polling
  const refrescar = useCallback(async () => { const [s] = await Promise.all([refrescarSituacion(), refrescarTrivia()]); return s; }, [refrescarSituacion, refrescarTrivia]);

  // Polling liviano: solo la situación (para ver al instante un Modo Rescate del gestor), solo en el inicio
  // y pausado con la pestaña en segundo plano. La trivia se refresca al volver de jugar.
  usarPolling(() => refrescarSituacion().catch(() => {}), POLL_MS, vista === "inicio");

  if (error) return <main className="mx-auto max-w-md p-6"><p className="card text-red-700">{error}</p><Link href="/" className="text-[#0072C6] underline">Volver al inicio</Link></main>;
  if (!sit) return (
    <main className="grid min-h-screen place-items-center">
      <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="relative h-24 w-24"><Image src="/pareas/pareas.png" alt="Cargando" fill sizes="96px" className="object-contain" /></motion.div>
    </main>
  );

  const volver = () => { setVista("inicio"); refrescar(); };
  const irA = (v: Vista) => { if (v === "inicio") volver(); else setVista(v); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const hayDeuda = sit.deuda.total > 0;
  const [y, m, d] = sit.fechaHoy.split("-").map(Number);
  const dia = DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];

  const ITEMS: { v: Vista; e: string; I: typeof IcInicio; ok: boolean }[] = [
    { v: "inicio", e: "Inicio", I: IcInicio, ok: true },
    { v: "pagar", e: "Pagar", I: IcTarjeta, ok: hayDeuda || !!sit.propuestaActiva },
    { v: "finanzas", e: "Finanzas", I: IcBilletera, ok: true },
    { v: "trivia", e: "Juego", I: IcMando, ok: true },
    { v: "asistente", e: "Pareas", I: IcBurbuja, ok: true },
  ];

  return (
    <main className="min-h-screen pb-36 text-[#1C1C1E]">
      {/* barra superior estilo iOS */}
      <header className="sticky top-0 z-30 bg-[#00529B] text-white shadow-[0_1px_0_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
          <Link href="/" className="flex min-h-[44px] items-center gap-2 text-[17px] font-semibold tracking-[0.02em]">
            <span className="relative h-[34px] w-[34px] overflow-hidden rounded-[9px] bg-white"><Image src="/pareas/pareas.png" alt="" fill sizes="34px" className="object-contain p-0.5" /></span><span className="max-sm:hidden">{APP_NOMBRE}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Notificaciones clienteId={clienteId} firma={`${sit.fechaHoy}|${sit.estado}|${sit.score}|${sit.regalo?.id ?? 0}|${sit.propuestaActiva?.pagos.filter((x) => x.pagado).length ?? -1}|${progreso?.respondidas ?? 0}`} onAccion={(a) => irA(a)} />
            <BotonReinicio claro />
            <Image src="/caja/logo-caja-piura-blanco.png" alt="Caja Piura" width={110} height={26} className="h-[24px] w-auto max-[400px]:hidden" priority />
            <span className="h-6 w-px max-[400px]:hidden bg-white/25" aria-hidden />
            <Link href="/" className="min-h-[44px] flex items-center text-[17px] text-white/90 hover:text-white">Salir</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={vista} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
            {vista === "inicio" ? (
              <>
                <div className="mb-3">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-500">{dia} {sit.fechaHoyLarga}</p>
                  <h1 className="text-[34px] font-bold leading-tight tracking-[-0.03em]">Hola, {sit.cliente.nombre}</h1>
                </div>
                <Inicio sit={sit} progreso={progreso} ir={(v) => irA(v)} />

                {MOSTRAR_HERRAMIENTAS_PRUEBA && (
                  <div className="mt-6 overflow-hidden rounded-[20px] bg-white text-[15px] shadow-[0_0_0_1px_#D6E4F5]">
                    <p className="px-4 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-neutral-500">Herramientas de prueba · {sit.fechaHoyLarga}</p>
                    <button className="flex min-h-[48px] w-full items-center gap-3 px-4 text-left hover:bg-black/[0.03]" onClick={async () => { await api("/api/pruebas/avanzar-dia", {}); refrescar(); }}><IcReloj tam={20} className="text-[#0072C6]" />Pasar un día</button>
                    <button className="flex min-h-[48px] w-full items-center gap-3 border-t border-black/5 px-4 text-left text-[#FF3B30] hover:bg-black/[0.03]" onClick={() => reiniciarTodo("/cliente")}><IcReiniciar tam={20} />Reiniciar toda la aplicación</button>
                  </div>
                )}
              </>
            ) : (
              <div className="mx-auto max-w-xl space-y-4">
                {vista === "finanzas" && <Finanzas sit={sit} clienteId={clienteId} onVolver={volver} onPagar={() => irA("pagar")} onAsistente={() => irA("asistente")} />}
                {vista === "pagar" && <Pagar sit={sit} onPagado={setSit} onVolver={volver} />}
                {vista === "trivia" && <Trivia sit={sit} onScore={(s) => { setSit(s); refrescarTrivia().catch(() => {}); }} onVolver={volver} />}
                {vista === "asistente" && <Asistente chat={chat} onVolver={volver} onPagar={() => irA("pagar")} />}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Bienvenida clienteId={clienteId} nombre={sit.cliente.nombre} />

      {/* Chatbot virtual de Pareas (burbuja flotante con su favicon) */}
      <BurbujaChat chat={chat} abierto={chatAbierto} setAbierto={setChatAbierto} onPagar={() => irA("pagar")} />

      {/* Barra de pestañas flotante (dock de cult-ui) */}
      <nav aria-label="Secciones">
        <Dock className="fixed bottom-3 left-1/2 h-auto items-end gap-2 rounded-[26px] bg-white/75 px-2.5 pb-1.5 pt-2 backdrop-blur-xl hover:bg-white/85">
          {ITEMS.filter((x) => x.ok).map((x, i) => (
            <DockCard key={x.e} id={String(i)} etiqueta={x.e} activo={vista === x.v} onClick={() => (x.v === "asistente" ? setChatAbierto(true) : irA(x.v))}>
              <span className="flex h-full w-full items-center justify-center"><x.I tam={22} /></span>
            </DockCard>
          ))}
        </Dock>
      </nav>
    </main>
  );
}
