"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { APP_NOMBRE } from "@/lib/config";
import { api, soles, type Situacion } from "@/lib/cliente-api";
import Pacaso from "@/components/Pacaso";
import Simulador, { type PlanElegido } from "./Simulador";
import Confirmar from "./Confirmar";
import Pagar from "./Pagar";
import Plan from "./Plan";
import Trivia from "./Trivia";
import Asistente from "./Asistente";

type Vista = "inicio" | "simulador" | "confirmar" | "plan" | "pagar" | "trivia" | "asistente";

export default function Dashboard({ clienteId }: { clienteId: number }) {
  const [sit, setSit] = useState<Situacion | null>(null);
  const [vista, setVista] = useState<Vista>("inicio");
  const [plan, setPlan] = useState<{ plan: PlanElegido; resultado: string; total: number } | null>(null);
  const [error, setError] = useState("");

  const refrescar = useCallback(async () => { const s = await api<Situacion>(`/api/cliente/${clienteId}`); setSit(s); return s; }, [clienteId]);
  useEffect(() => { api<Situacion>(`/api/cliente/${clienteId}?abrir=1`).then(setSit).catch((e) => setError(e.message)); }, [clienteId]);

  if (error) return <main className="p-6 max-w-md mx-auto"><p className="card text-red-700">{error}</p><Link href="/" className="underline text-caja">Volver al inicio</Link></main>;
  if (!sit) return <main className="p-6 max-w-md mx-auto"><p>Cargando…</p></main>;

  const volver = () => { setVista("inicio"); refrescar(); };
  const hayDeuda = sit.deuda.total > 0 && sit.estado !== "reprogramado";
  const puedeArmar = !!sit.limites && hayDeuda && !sit.propuestaDerivada;

  return (
    <main className="max-w-md md:max-w-xl mx-auto pb-16">
      <header className="bg-caja-header text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold">{APP_NOMBRE}</span>
        <Link href="/" className="text-sm underline opacity-90 min-h-[44px] flex items-center">Salir</Link>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {vista === "simulador" && puedeArmar && <Simulador sit={sit} onVolver={volver} onContinuar={(p, r, t) => { setPlan({ plan: p, resultado: r, total: t }); setVista("confirmar"); }} />}
        {vista === "confirmar" && plan && <Confirmar sit={sit} plan={plan.plan} resultado={plan.resultado} total={plan.total} onVolver={() => setVista("simulador")} onListo={(s) => { setSit(s); setVista("plan"); }} />}
        {vista === "plan" && <Plan sit={sit} onVolver={volver} onPagar={() => setVista("pagar")} />}
        {vista === "pagar" && <Pagar sit={sit} onPagado={setSit} onVolver={volver} />}
        {vista === "trivia" && <Trivia sit={sit} onScore={setSit} onVolver={volver} />}
        {vista === "asistente" && <Asistente sit={sit} onVolver={volver} />}

        {vista === "inicio" && (
          <>
            <section className="card space-y-4">
              <p className="text-lg leading-snug">{sit.saludo}</p>
              {hayDeuda && (
                <div className="rounded-xl bg-caja-fondo border border-caja-borde p-3">
                  <p className="text-sm text-gray-600">Tu deuda de hoy</p>
                  <p className="text-4xl font-bold text-caja">{soles(sit.deuda.total)}</p>
                  <dl className="mt-2 text-sm grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                    <dt>Cuotas pendientes</dt><dd className="font-semibold">{soles(sit.deuda.montoVencido)}</dd>
                    <dt>Interés moratorio</dt><dd className="font-semibold">{soles(sit.deuda.interesMoratorio)}</dd>
                    <dt>Días de atraso</dt><dd className="font-semibold">{sit.diasAtraso}</dd>
                  </dl>
                  {sit.deuda.cuotas.map((c, i) => <p key={i} className="text-xs text-gray-500 mt-1">Cuota de {soles(c.monto)} vencida el {c.vencioLargo}</p>)}
                </div>
              )}
              <Pacaso humor={sit.pacaso.humor} mensaje={sit.pacaso.mensaje} grande />
              <div>
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold">Tus puntos: {sit.score}/100</span>
                  <span className={`text-sm font-bold rounded-full px-3 py-1 ${sit.nivel === "Oro" ? "bg-caja-acento" : sit.nivel === "Plata" ? "bg-gray-200" : "bg-orange-200"}`}>Nivel {sit.nivel}</span>
                </div>
                <div className="h-3 rounded-full bg-caja-borde mt-1 overflow-hidden"><div className="h-3 bg-caja-medio transition-all" style={{ width: `${sit.score}%` }} /></div>
                <p className="text-sm mt-1">{sit.siguienteNivel.texto}. {sit.beneficios}</p>
              </div>
            </section>

            {sit.propuestaActiva && <button className="btn w-full" onClick={() => setVista("plan")}>Ver mi plan de pago</button>}
            {sit.propuestaDerivada && <button className="btn w-full" onClick={() => setVista("plan")}>Ver mi propuesta enviada</button>}

            <h2 className="font-bold text-caja text-lg">¿Cómo quieres seguir?</h2>
            <div className="grid gap-3">
              {(hayDeuda || sit.estado === "reprogramado") && <button className="btn btn-acento" onClick={() => setVista("pagar")}>💳 Pagar hoy</button>}
              {puedeArmar && <button className="btn" onClick={() => setVista("simulador")}>🧮 Armar mi plan de pago</button>}
              <button className="btn bg-white text-caja border border-caja" onClick={() => setVista("asistente")}>💬 Hablar con el asistente</button>
              <button className="btn bg-white text-caja border border-caja" onClick={() => setVista("trivia")}>🎮 Trivia del día · suma puntos</button>
            </div>

            <details className="card text-sm">
              <summary className="cursor-pointer font-semibold min-h-[44px] flex items-center">Historial de mis puntos</summary>
              <ul className="divide-y divide-caja-borde">
                {sit.historialScore.map((m) => (
                  <li key={m.id} className="py-2 flex justify-between gap-2"><span>{m.detalle}</span><b className={m.puntos < 0 ? "text-red-700" : "text-green-700"}>{m.puntos > 0 ? "+" : ""}{m.puntos}</b></li>
                ))}
              </ul>
            </details>

            <details className="rounded-tarjeta border border-dashed border-gray-400 p-3 text-sm text-gray-600">
              <summary className="cursor-pointer min-h-[44px] flex items-center">Herramientas de la demo ({sit.fechaDemoLarga})</summary>
              <div className="flex gap-2 flex-wrap mt-2">
                <button className="btn bg-gray-700 text-sm" onClick={async () => { await api("/api/demo/avanzar-dia", {}); refrescar(); }}>Pasar un día ⏭</button>
                <button className="btn bg-gray-500 text-sm" onClick={async () => { await api("/api/demo/reset", {}); refrescar(); }}>Reiniciar demo</button>
              </div>
            </details>
          </>
        )}
      </div>
    </main>
  );
}
