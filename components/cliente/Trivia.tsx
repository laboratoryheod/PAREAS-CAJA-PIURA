"use client";
import { useCallback, useEffect, useState } from "react";
import { api, type Situacion } from "@/lib/cliente-api";
import Pacaso from "@/components/Pacaso";

export default function Trivia({ sit, onScore, onVolver }: { sit: Situacion; onScore: (s: Situacion) => void; onVolver: () => void }) {
  const [t, setT] = useState<any>(null);
  const [res, setRes] = useState<any>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(() => { api(`/api/trivia?clienteId=${sit.cliente.id}`).then(setT).catch((e) => setError(e.message)); }, [sit.cliente.id]);
  useEffect(cargar, [cargar]);

  async function responder(i: number) {
    if (res || !t?.pregunta) return;
    setElegida(i);
    try {
      const r = await api("/api/trivia/responder", { clienteId: sit.cliente.id, preguntaId: t.pregunta.id, opcion: i });
      setRes(r);
      api(`/api/cliente/${sit.cliente.id}`).then(onScore);
    } catch (e: any) { setError(e.message); }
  }
  function siguiente() { setRes(null); setElegida(null); cargar(); }

  const pr = res?.progreso ?? t?.progreso;
  return (
    <section className="space-y-4">
      <button onClick={onVolver} className="text-sm text-caja underline min-h-[44px]">← Volver</button>
      <div className="card space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-caja">Trivia del día</h2>
          {pr && <span className="text-sm">{pr.respondidas}/{pr.total} · +{pr.puntosTriviaHoy}/{pr.topeDia} pts</span>}
        </div>
        {pr && <div className="h-2 rounded-full bg-caja-borde"><div className="h-2 rounded-full bg-caja-acento transition-all" style={{ width: `${(pr.respondidas / pr.total) * 100}%` }} /></div>}
        {error && <p className="text-red-700 text-sm">{error}</p>}

        {t?.pregunta && (
          <>
            <p className="text-xs uppercase tracking-wide text-gray-500">{t.pregunta.categoria}</p>
            <p className="font-semibold text-lg">{t.pregunta.pregunta}</p>
            <div className="space-y-2">
              {t.pregunta.opciones.map((o: string, i: number) => {
                const estado = res ? (i === res.correcta ? "bg-green-100 border-green-500" : i === elegida ? "bg-red-50 border-red-400" : "border-caja-borde") : "border-caja-borde active:bg-caja-borde/50";
                return <button key={i} onClick={() => responder(i)} disabled={!!res} className={`w-full text-left min-h-[48px] rounded-xl border px-3 py-2 ${estado}`}>{o}</button>;
              })}
            </div>
          </>
        )}

        {res && (
          <div className="space-y-2">
            <p className="font-semibold">{res.acerto ? "✅ " : "💡 "}{res.mensaje}</p>
            <p className="text-sm">{res.explicacion}</p>
            {res.mensajeRacha && <p className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-sm">{res.mensajeRacha}</p>}
            <Pacaso humor={res.pacaso.humor} mensaje={res.pacaso.mensaje} />
            <p className="text-sm">Tus puntos: <b>{res.score}</b> · Nivel {res.nivel}</p>
            {!res.progreso.completo && <button className="btn w-full" onClick={siguiente}>Siguiente pregunta</button>}
          </div>
        )}
        {t && !t.pregunta && !res && <p className="font-semibold">{t.mensaje}</p>}
        {res?.progreso.completo && <p className="font-semibold">¡Completaste la trivia de hoy! Vuelve mañana por más puntos.</p>}
      </div>
    </section>
  );
}
