"use client";
import { useState } from "react";
import { api, soles, type Situacion } from "@/lib/cliente-api";
import type { PlanElegido } from "./Simulador";

const MOTIVOS = [
  { id: "olvido", texto: "Me olvidé de pagar" },
  { id: "bajaron_ventas", texto: "Bajaron mis ventas" },
  { id: "salud", texto: "Un tema de salud" },
  { id: "otro", texto: "Otro motivo" },
];

export default function Confirmar({ sit, plan, resultado, total, onListo, onVolver }: { sit: Situacion; plan: PlanElegido; resultado: string; total: number; onListo: (s: Situacion) => void; onVolver: () => void }) {
  const [acepta, setAcepta] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const derivada = resultado === "derivada";

  async function enviar() {
    setEnviando(true); setError("");
    try {
      const r = await api("/api/propuesta", { clienteId: sit.cliente.id, ...plan, motivo, acepta });
      onListo(r.situacion);
    } catch (e: any) { setError(e.message); setEnviando(false); }
  }

  return (
    <section className="space-y-4">
      <button onClick={onVolver} className="text-sm text-caja underline min-h-[44px]">← Cambiar mi plan</button>
      <div className="card space-y-2">
        <h2 className="text-xl font-bold text-caja">Confirma tu plan</h2>
        <p>{plan.inicial > 0 ? <>Pagarás una inicial de <b>{soles(plan.inicial)}</b> hoy y </> : "Pagarás "}el resto en <b>{plan.nCuotas} cuota{plan.nCuotas === 1 ? "" : "s"}</b>, empezando el <b>{plan.fechaPrimerPago.split("-").reverse().join("/")}</b>.</p>
        <p>Total: <b>{soles(total)}</b></p>
        {derivada && <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm">Por los días de atraso, un gestor revisará tu propuesta y se comunicará contigo. Mientras tanto, puedes seguir usando el módulo.</p>}
      </div>

      <fieldset className="card space-y-2">
        <legend className="font-bold px-1">¿Qué pasó este mes?</legend>
        <p className="text-sm text-gray-600">Nos ayuda a acompañarte mejor. No afecta tu plan.</p>
        {MOTIVOS.map((m) => (
          <label key={m.id} className={`flex items-center gap-3 min-h-[48px] rounded-xl border px-3 cursor-pointer ${motivo === m.id ? "border-caja bg-caja-borde/40" : "border-caja-borde"}`}>
            <input type="radio" name="motivo" checked={motivo === m.id} onChange={() => setMotivo(m.id)} /> {m.texto}
          </label>
        ))}
      </fieldset>

      <label className="card flex gap-3 items-start text-sm cursor-pointer">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
        <span>Acepto las condiciones de este plan de pago y me comprometo a cumplir las fechas indicadas.</span>
      </label>

      {error && <p className="text-red-700 text-sm">{error}</p>}
      <button className="btn btn-acento w-full disabled:opacity-40" disabled={!acepta || !motivo || enviando} onClick={enviar}>
        {enviando ? "Enviando…" : derivada ? "Enviar mi propuesta al gestor" : "Confirmar mi plan"}
      </button>
    </section>
  );
}
