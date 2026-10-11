"use client";
// Notificaciones del gestor: campana con los eventos que requieren su atención (un cliente pidió ayuda,
// incumplió su plan, dejó una propuesta para revisión o pagó). Aviso flotante cuando llega uno nuevo.
// Usa el feed incremental del servidor (/api/banco/feed) y recuerda en el navegador hasta dónde leyó.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usarPolling } from "@/lib/usar-polling";
import { FichaApp, IcCampana, IcCerrar, IcGestor, IcLatigo, IcLista, IcTarjeta, type ColorFicha } from "@/components/iconos";
import { cn } from "@/lib/utils";

interface Evento { id: number; tipo: string; clienteId: number; creadoEn: string; texto: string }
const CLAVE_VISTO = "pareas-gestor-visto";
const CONSULTA_MS = 10000;

/** Solo lo que pide acción o seguimiento del gestor. */
function relevante(e: Evento) {
  return e.tipo === "ayuda_humana" || e.tipo === "promesa_incumplida" || e.tipo === "pago_registrado" || (e.tipo === "propuesta_enviada" && e.texto.includes("para el gestor"));
}
const ESTILO: Record<string, { icono: typeof IcGestor; color: ColorFicha; etiqueta: string }> = {
  ayuda_humana: { icono: IcGestor, color: "sol", etiqueta: "Pidió ayuda" },
  promesa_incumplida: { icono: IcLatigo, color: "rojo", etiqueta: "Incumplió su plan" },
  propuesta_enviada: { icono: IcLista, color: "cielo", etiqueta: "Propuesta por revisar" },
  pago_registrado: { icono: IcTarjeta, color: "verde", etiqueta: "Pago recibido" },
};
const leer = () => { try { return Number(localStorage.getItem(CLAVE_VISTO) ?? 0); } catch { return 0; } };
const guardar = (n: number) => { try { localStorage.setItem(CLAVE_VISTO, String(n)); } catch { /* sin almacenamiento */ } };

function hace(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  return s < 60 ? "hace un momento" : s < 3600 ? `hace ${Math.floor(s / 60)} min` : s < 86400 ? `hace ${Math.floor(s / 3600)} h` : `hace ${Math.floor(s / 86400)} d`;
}

export function NotificacionesGestor() {
  const [items, setItems] = useState<Evento[]>([]);
  const [visto, setVisto] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState<Evento | null>(null);
  const ultimo = useRef(0);
  const cargado = useRef(false);

  const leerFeed = useCallback(async () => {
    try {
      const r = await fetch(`/api/banco/feed?desde=${ultimo.current}`, { cache: "no-store" });
      if (!r.ok) return;
      const fd = (await r.json()) as { items: Evento[]; ultimoId: number };
      const nuevos = fd.items.filter(relevante);
      if (nuevos.length) {
        setItems((prev) => { const ids = new Set(prev.map((x) => x.id)); return [...[...nuevos].reverse().filter((x) => !ids.has(x.id)), ...prev].slice(0, 40); });
        // Aviso flotante solo para lo que llega con el panel abierto en pantalla (no para el historial inicial)
        if (cargado.current) setAviso(nuevos[nuevos.length - 1]);
      }
      if (fd.ultimoId > ultimo.current) ultimo.current = fd.ultimoId;
      cargado.current = true;
    } catch { /* sin conexión: se reintenta en la próxima consulta */ }
  }, []);

  useEffect(() => { setVisto(leer()); leerFeed(); }, [leerFeed]);
  usarPolling(leerFeed, CONSULTA_MS);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 6500); return () => clearTimeout(t); }, [aviso]);
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  const sinLeer = items.filter((x) => x.id > visto).length;
  const marcarLeido = () => { const max = Math.max(visto, ...items.map((x) => x.id)); setVisto(max); guardar(max); };

  return (
    <>
      <button onClick={() => { setAbierto((x) => !x); setAviso(null); }} aria-label={`Notificaciones del gestor (${sinLeer} sin leer)`} aria-expanded={abierto}
        className="relative grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25">
        <IcCampana tam={19} />
        {sinLeer > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#FF3B30] px-1 text-[11px] font-bold tabular-nums">{sinLeer > 9 ? "9+" : sinLeer}</span>}
      </button>

      <AnimatePresence>
        {abierto && (
          <>
            <motion.div className="fixed inset-0 z-[55] bg-black/15" onClick={() => setAbierto(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.section role="dialog" aria-label="Notificaciones del gestor"
              className="fixed right-3 top-16 z-[56] w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-[22px] bg-white text-[#1C1C1E] shadow-[0_20px_50px_rgba(0,30,80,0.3)]"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }}>
              <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
                <p className="text-[16px] font-bold">Notificaciones</p>
                <div className="flex items-center gap-1">
                  {sinLeer > 0 && <button onClick={marcarLeido} className="min-h-[40px] rounded-lg px-2 text-[13px] font-semibold text-caja-medio hover:bg-[#EAF2FC]">Marcar todo como leído</button>}
                  <button onClick={() => setAbierto(false)} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full text-neutral-500 hover:bg-black/5"><IcCerrar tam={18} /></button>
                </div>
              </div>
              <ul className="max-h-[60vh] divide-y divide-black/5 overflow-y-auto">
                {items.length === 0 && <li className="p-4 text-sm text-gray-500">Sin novedades por ahora.</li>}
                {items.map((e) => {
                  const st = ESTILO[e.tipo] ?? ESTILO.ayuda_humana;
                  return (
                    <li key={e.id}>
                      <Link href={`/banco/cliente/${e.clienteId}`} onClick={() => setAbierto(false)} className={cn("flex items-start gap-3 px-4 py-3 hover:bg-[#F5F9FE]", e.id > visto && "bg-[#EAF2FC]/60")}>
                        <FichaApp icono={st.icono} color={st.color} tam={34} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-neutral-500"><span>{st.etiqueta}</span><span className="normal-case tracking-normal">{hace(e.creadoEn)}</span></span>
                          <span className="block text-[14px] leading-snug">{e.texto}</span>
                        </span>
                        {e.id > visto && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#0072C6]" aria-label="Sin leer" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.section>
          </>
        )}
      </AnimatePresence>

      {/* Aviso flotante de un evento nuevo */}
      <div className="pointer-events-none fixed right-3 top-16 z-[70] w-[min(380px,calc(100vw-24px))]">
        <AnimatePresence>
          {aviso && !abierto && (
            <motion.div key={aviso.id} role="status" aria-live="polite" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
              className="pointer-events-auto flex items-start gap-3 rounded-[20px] bg-white p-3 text-[#1C1C1E] shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_16px_40px_rgba(0,30,80,0.25)]">
              <FichaApp icono={(ESTILO[aviso.tipo] ?? ESTILO.ayuda_humana).icono} color={(ESTILO[aviso.tipo] ?? ESTILO.ayuda_humana).color} tam={36} />
              <Link href={`/banco/cliente/${aviso.clienteId}`} onClick={() => setAviso(null)} className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold uppercase tracking-[0.05em] text-neutral-500">{(ESTILO[aviso.tipo] ?? ESTILO.ayuda_humana).etiqueta}</span>
                <span className="block text-[14px] font-semibold leading-snug">{aviso.texto}</span>
              </Link>
              <button onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-neutral-400 hover:bg-black/5"><IcCerrar tam={16} /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
