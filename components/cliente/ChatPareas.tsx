"use client";
// Chatbot virtual de Pareas: burbuja flotante con el favicon de Pareas y panel de chat. Responde sobre pagos,
// campañas, Mis Finanzas y la Caja. Las respuestas vienen del servidor (/api/asistente): filtros, FAQ y, si está
// configurada, la IA (OpenAI o Gemini) con los montos y fechas calculados por el servidor.
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { api, type Situacion } from "@/lib/cliente-api";
import { IcBurbuja, IcCerrar } from "@/components/iconos";
import { cn } from "@/lib/utils";

export interface Mensaje { rol: "usuario" | "asistente"; texto: string }
export const SUGERENCIAS_CHAT = ["¿Cuánto debo hoy?", "¿Cuándo vence mi cuota?", "¿Qué es el Modo Rescate?", "¿Cómo pago con QR?", "¿Cómo organizo mis gastos?", "Quiero hablar con un gestor"];

/** Estado de la conversación (compartido entre la burbuja y la pestaña "Pareas"). */
export function usarConversacion(sit: Situacion) {
  const [msgs, setMsgs] = useState<Mensaje[]>(() => [{ rol: "asistente", texto: `Hola, ${sit.cliente.nombre}. Soy Pareas, su asistente virtual de la Caja. Puedo ayudarle con sus pagos, sus campañas, sus puntos y sus finanzas. Nunca le pediré claves ni datos de tarjeta.` }]);
  const [esperando, setEsperando] = useState(false);
  const enviar = useCallback(async (t: string) => {
    const limpio = t.trim();
    if (!limpio || esperando) return;
    const historial = msgs.slice(1);
    setMsgs((m) => [...m, { rol: "usuario", texto: limpio }]);
    setEsperando(true);
    try {
      const r = await api<{ respuesta: string }>("/api/asistente", { clienteId: sit.cliente.id, mensaje: limpio, historial });
      setMsgs((m) => [...m, { rol: "asistente", texto: r.respuesta }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { rol: "asistente", texto: e.message || "No pude responder. Intente de nuevo en unos segundos." }]);
    }
    setEsperando(false);
  }, [msgs, esperando, sit.cliente.id]);
  return { msgs, esperando, enviar };
}
export type Conversacion = ReturnType<typeof usarConversacion>;

/** Cuerpo del chat: mensajes, sugerencias y caja de texto. */
export function PanelChat({ chat, alto = "h-full", onPagar }: { chat: Conversacion; alto?: string; onPagar?: () => void }) {
  const [texto, setTexto] = useState("");
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [chat.msgs, chat.esperando]);
  return (
    <div className={cn("flex min-h-0 flex-col", alto)}>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3" aria-live="polite" aria-label="Conversación con Pareas">
        {chat.msgs.map((m, i) => (
          <div key={i} className={cn("flex items-end gap-2", m.rol === "usuario" && "justify-end")}>
            {m.rol === "asistente" && <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white shadow-[0_0_0_1px_#D6E4F5]"><Image src="/pareas/logo.png" alt="" fill sizes="28px" className="object-cover" /></span>}
            <p className={cn("max-w-[82%] whitespace-pre-line rounded-[18px] px-3.5 py-2 text-[15px] leading-snug", m.rol === "usuario" ? "rounded-br-[6px] bg-caja text-white" : "rounded-bl-[6px] bg-[#EAF2FC] text-[#1C1C1E]")}>{m.texto}</p>
          </div>
        ))}
        {chat.esperando && (
          <div className="flex items-center gap-2 pl-9 text-[14px] text-neutral-500" role="status">
            <span className="flex gap-1" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-[#0072C6]/60" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>
            Pareas está escribiendo…
          </div>
        )}
        <div ref={fin} />
      </div>
      <div className="flex gap-2 overflow-x-auto px-3 pb-2" aria-label="Preguntas sugeridas">
        {SUGERENCIAS_CHAT.map((s) => (
          <button key={s} onClick={() => chat.enviar(s)} disabled={chat.esperando} className="min-h-[40px] shrink-0 rounded-full border border-[#B9D3F0] bg-white px-3 text-[13px] font-semibold text-caja hover:bg-[#EAF2FC] disabled:opacity-50">{s}</button>
        ))}
        {onPagar && <button onClick={onPagar} className="min-h-[40px] shrink-0 rounded-full bg-[#F9A825] px-3 text-[13px] font-semibold text-[#1A1A1A]">Pagar con QR</button>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); chat.enviar(texto); setTexto(""); }} className="flex gap-2 border-t border-black/5 p-3">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escriba su consulta…" maxLength={300} aria-label="Su consulta para Pareas"
          className="min-h-[48px] min-w-0 flex-1 rounded-full border border-caja-borde bg-white px-4 text-[16px] focus:border-caja-medio focus:outline-none" />
        <button disabled={chat.esperando || !texto.trim()} className="min-h-[48px] shrink-0 rounded-full bg-caja px-5 text-[15px] font-semibold text-white disabled:opacity-40">Enviar</button>
      </form>
    </div>
  );
}

/** Burbuja flotante con el favicon de Pareas que abre el chat. */
export function BurbujaChat({ chat, abierto, setAbierto, onPagar }: { chat: Conversacion; abierto: boolean; setAbierto: (v: boolean) => void; onPagar: () => void }) {
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto, setAbierto]);

  return (
    <>
      <AnimatePresence>
        {abierto && (
          <motion.section role="dialog" aria-label="Chat con Pareas"
            className="fixed inset-x-2 bottom-2 z-[58] flex h-[min(620px,82dvh)] flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_24px_60px_rgba(0,30,80,0.35)] sm:inset-x-auto sm:bottom-[104px] sm:right-4 sm:w-[400px]"
            initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }} transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
            <header className="flex items-center gap-3 border-b-[3px] border-[#F39200] bg-caja-header px-4 py-3 text-white">
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white"><Image src="/pareas/logo.png" alt="" fill sizes="40px" className="object-cover" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-bold leading-tight">Pareas</p>
                <p className="flex items-center gap-1.5 text-[12px] text-white/80"><span className="h-2 w-2 rounded-full bg-[#34C759]" aria-hidden />Asistente virtual · pagos, campañas y finanzas</p>
              </div>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar chat" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"><IcCerrar tam={20} /></button>
            </header>
            <PanelChat chat={chat} alto="min-h-0 flex-1" onPagar={() => { setAbierto(false); onPagar(); }} />
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button onClick={() => setAbierto(!abierto)} aria-label={abierto ? "Cerrar chat con Pareas" : "Abrir chat con Pareas"} aria-expanded={abierto}
        whileTap={{ scale: 0.94 }}
        className={cn("fixed bottom-[104px] right-3 z-[57] grid h-16 w-16 place-items-center rounded-full bg-white shadow-[0_0_0_3px_#0047AB,0_12px_28px_rgba(0,40,90,0.35)] md:right-[max(12px,calc(50%-500px))]", abierto && "max-sm:hidden")}>
        <span className="relative h-[52px] w-[52px] overflow-hidden rounded-full"><Image src="/pareas/logo.png" alt="" fill sizes="52px" className="object-cover" /></span>
        {!abierto && <span className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-[#F9A825] text-[#1A1A1A] shadow-[0_0_0_2px_#fff]" aria-hidden><IcBurbuja tam={15} strokeWidth={2.2} /></span>}
      </motion.button>
    </>
  );
}
