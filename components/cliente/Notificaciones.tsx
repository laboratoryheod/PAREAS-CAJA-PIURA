"use client";
// Notificaciones del cliente: banners tipo iOS + centro de notificaciones. Los textos y fechas vienen del servidor
// (/api/notificaciones). Se activan con la campana de la barra superior; quedan guardadas por navegador.
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { api } from "@/lib/cliente-api";
import { APP_NOMBRE, MOSTRAR_HERRAMIENTAS_PRUEBA } from "@/lib/config";
import { FichaApp, IcCalendario, IcCampana, IcCerrar, IcLatigo, IcMando, IcBillete, type ColorFicha } from "@/components/iconos";
import { cn } from "@/lib/utils";

export type AccionNotificacion = "pagar" | "trivia" | "finanzas";
interface Notif { id: string; tipo: "rescate" | "pago_cerca" | "mora" | "trivia"; titulo: string; mensaje: string; accion: AccionNotificacion }

const CLAVE_ACTIVAS = "pareas-notificaciones";
const CLAVE_VISTAS = "pareas-notif-vistas";
const DURACION_MS = 6500;
const ESTILO: Record<Notif["tipo"], { icono: typeof IcCampana; color: ColorFicha }> = {
  rescate: { icono: IcBillete, color: "rescate" },
  pago_cerca: { icono: IcCalendario, color: "sol" },
  mora: { icono: IcLatigo, color: "rojo" },
  trivia: { icono: IcMando, color: "violeta" },
};

const leer = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

export function Notificaciones({ clienteId, firma, onAccion }: { clienteId: number; firma: string; onAccion: (a: AccionNotificacion) => void }) {
  const [activas, setActivas] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [cola, setCola] = useState<Notif[]>([]);
  const [abierto, setAbierto] = useState(false);
  const vistas = useRef<Set<string>>(new Set());

  useEffect(() => {
    setActivas(leer(CLAVE_ACTIVAS) === "1");
    try { vistas.current = new Set(JSON.parse(leer(CLAVE_VISTAS) ?? "[]")); } catch { vistas.current = new Set(); }
  }, []);

  const encolarNuevas = useCallback((lista: Notif[]) => {
    const nuevas = lista.filter((n) => !vistas.current.has(n.id));
    if (!nuevas.length) return;
    nuevas.forEach((n) => vistas.current.add(n.id));
    guardar(CLAVE_VISTAS, JSON.stringify([...vistas.current].slice(-80)));
    setCola((c) => [...c, ...nuevas]);
    // Si el navegador lo permite, además se envía como notificación del sistema
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        nuevas.forEach((n) => new Notification(n.titulo, { body: n.mensaje, icon: "/pareas/logo.png", tag: n.id }));
      }
    } catch { /* algunos navegadores no permiten crear notificaciones aquí */ }
  }, []);

  // Se consultan cuando cambia la situación del cliente (firma): nuevo día, pago, plan, Modo Rescate, trivia…
  useEffect(() => {
    let vivo = true;
    api<{ items: Notif[] }>(`/api/notificaciones?clienteId=${clienteId}`).then((r) => { if (!vivo) return; setItems(r.items); if (activas) encolarNuevas(r.items); }).catch(() => {});
    return () => { vivo = false; };
  }, [clienteId, firma, activas, encolarNuevas]);

  // Escape cierra el centro de notificaciones
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  // Un banner a la vez; se va solo. Con el centro abierto no se muestran banners (ahí ya se ven todas).
  const actual = abierto ? undefined : cola[0];
  useEffect(() => { if (!actual) return; const t = setTimeout(() => setCola((c) => c.slice(1)), DURACION_MS); return () => clearTimeout(t); }, [actual]);
  const abrirCentro = () => { setCola([]); setAbierto(true); };

  async function activar() {
    guardar(CLAVE_ACTIVAS, "1"); setActivas(true);
    try { if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission(); } catch { /* opcional */ }
  }
  function desactivar() { guardar(CLAVE_ACTIVAS, "0"); setActivas(false); setCola([]); }
  function reenviar() { vistas.current = new Set(); guardar(CLAVE_VISTAS, "[]"); setAbierto(false); setCola([]); encolarNuevas(items); }
  const tocar = (n: Notif) => { setCola((c) => c.filter((x) => x.id !== n.id)); setAbierto(false); onAccion(n.accion); };

  return (
    <>
      {/* Campana de la barra superior (desactivadas: píldora para activarlas, como el botón Reiniciar) */}
      {activas ? (
        <button onClick={() => (abierto ? setAbierto(false) : abrirCentro())} aria-label={`Notificaciones (${items.length})`} aria-expanded={abierto}
          className="relative grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 active:scale-[0.96]">
          <IcCampana tam={19} />
          {items.length > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#FF3B30] px-1 text-[11px] font-bold tabular-nums">{items.length}</span>}
        </button>
      ) : (
        <button onClick={activar} aria-label="Activar notificaciones"
          className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#F9A825] px-3 text-[13px] font-semibold text-[#1A1A1A] transition-transform active:scale-[0.96]">
          <IcCampana tam={16} /><span className="max-sm:hidden">Activar avisos</span>
        </button>
      )}

      {/* Centro de notificaciones */}
      <AnimatePresence>
        {abierto && (
          <>
            <motion.div className="fixed inset-0 z-[55] bg-black/20" onClick={() => setAbierto(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.section role="dialog" aria-label="Centro de notificaciones"
              className="fixed inset-x-3 top-16 z-[56] mx-auto max-w-md overflow-hidden rounded-[26px] bg-white/90 text-[#1C1C1E] shadow-[0_20px_50px_rgba(0,30,80,0.3)] backdrop-blur-xl"
              initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }}>
              <div className="flex items-center justify-between px-4 pb-2 pt-3">
                <p className="text-[17px] font-bold tracking-[-0.02em]">Notificaciones</p>
                <button onClick={() => setAbierto(false)} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full text-neutral-500 hover:bg-black/5"><IcCerrar tam={18} /></button>
              </div>
              <ul className="max-h-[55vh] space-y-2 overflow-y-auto px-3 pb-3">
                {items.length === 0 && <li className="rounded-2xl bg-[#EAF2FC] p-3 text-[14px] text-neutral-600">Nada nuevo por ahora, compare. ¡Vas bien!</li>}
                {items.map((n) => (
                  <li key={n.id}>
                    <button onClick={() => tocar(n)} className="flex w-full items-start gap-3 rounded-2xl bg-[#EAF2FC] p-3 text-left transition-colors hover:bg-[#DCE9F8]">
                      <FichaApp icono={ESTILO[n.tipo].icono} color={ESTILO[n.tipo].color} tam={36} />
                      <span className="min-w-0"><span className="block text-[14px] font-semibold">{n.titulo}</span><span className="block text-[13px] leading-snug text-neutral-600">{n.mensaje}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-2 border-t border-black/5 px-4 py-2.5 text-[13px]">
                <button onClick={desactivar} className="min-h-[40px] font-semibold text-neutral-500">Desactivar avisos</button>
                {MOSTRAR_HERRAMIENTAS_PRUEBA && <button onClick={reenviar} className="min-h-[40px] font-semibold text-[#0072C6]">Volver a enviar</button>}
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>

      {/* Banner tipo iOS */}
      <div className="pointer-events-none fixed inset-x-0 top-2 z-[70] flex justify-center px-3">
        <AnimatePresence mode="wait">
          {actual && (
            <motion.button key={actual.id} onClick={() => tocar(actual)} drag="y" dragConstraints={{ top: -120, bottom: 0 }} dragElastic={0.2}
              onDragEnd={(_, info) => { if (info.offset.y < -40) setCola((c) => c.slice(1)); }}
              role="status" aria-live="polite"
              className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[22px] bg-white/85 p-3 text-left text-[#1C1C1E] shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_16px_40px_rgba(0,30,80,0.25)] backdrop-blur-xl"
              initial={{ y: -90, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -90, opacity: 0 }} transition={{ type: "spring", bounce: 0.25, duration: 0.55 }}>
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[11px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06)]"><Image src="/pareas/logo.png" alt="" fill sizes="40px" className="object-cover" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between text-[12px] text-neutral-500"><span className="font-semibold uppercase tracking-[0.06em]">{APP_NOMBRE}</span><span>ahora</span></span>
                <span className={cn("mt-0.5 flex items-center gap-1.5 text-[15px] font-semibold", actual.tipo === "mora" && "text-[#C9182B]")}>{actual.titulo}</span>
                <span className="mt-0.5 line-clamp-3 block text-[14px] leading-snug text-neutral-700">{actual.mensaje}</span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
