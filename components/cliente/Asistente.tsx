"use client";
import { useEffect, useRef, useState } from "react";
import { TextureButton } from "@/components/ui/texture-button";
import { api, type Situacion } from "@/lib/cliente-api";

interface Msg { rol: "usuario" | "asistente"; texto: string }
const SUGERENCIAS = ["¿Cuánto debo hoy?", "¿Qué plan puedo armar?", "¿Cómo pago?", "¿Qué es el Regalo Salvador?", "Quiero hablar con un gestor"];

export default function Asistente({ sit, onVolver }: { sit: Situacion; onVolver: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ rol: "asistente", texto: `¡Habla, ${sit.cliente.nombre}! Soy Pareas 🦎, tu pata de la Caja. Te ayudo con tu deuda, tu plan y cómo pagar. Ojo: nunca te voy a pedir claves ni datos de tarjeta.` }]);
  const [texto, setTexto] = useState("");
  const [esperando, setEsperando] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function enviar(t: string) {
    const limpio = t.trim();
    if (!limpio || esperando) return;
    const historial = msgs.slice(1);
    setMsgs((m) => [...m, { rol: "usuario", texto: limpio }]); setTexto(""); setEsperando(true);
    try {
      const r = await api("/api/asistente", { clienteId: sit.cliente.id, mensaje: limpio, historial });
      setMsgs((m) => [...m, { rol: "asistente", texto: r.respuesta }]);
    } catch (e: any) { setMsgs((m) => [...m, { rol: "asistente", texto: e.message }]); }
    setEsperando(false);
  }

  return (
    <section className="space-y-3">
      <button onClick={onVolver} className="text-sm text-caja underline min-h-[44px]">← Volver</button>
      <div className="card space-y-3">
        <h2 className="text-xl font-extrabold text-caja">💬 Habla con Pareas</h2><p className="text-xs text-gray-500">Solo temas de tu deuda, tu plan y la Caja.</p>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto" aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.rol === "usuario" ? "justify-end" : ""}`}>
              <p className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.rol === "usuario" ? "bg-caja text-white rounded-br-sm" : "bg-caja-borde/40 border border-caja-borde rounded-bl-sm"}`}>{m.texto}</p>
            </div>
          ))}
          {esperando && <p className="text-sm text-gray-500">Escribiendo…</p>}
          <div ref={fin} />
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGERENCIAS.map((s) => <button key={s} onClick={() => enviar(s)} className="text-xs rounded-full border border-caja text-caja px-3 min-h-[36px]">{s}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="flex gap-2">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu pregunta…" maxLength={300} className="flex-1 min-w-0 min-h-[48px] rounded-full border border-caja-borde px-4" />
          <TextureButton className="w-auto shrink-0" disabled={esperando}>Enviar</TextureButton>
        </form>
      </div>
    </section>
  );
}
