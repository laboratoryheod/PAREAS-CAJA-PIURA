"use client";
import { useEffect, useState } from "react";
import { FichaApp, IcCalculadora, IcCheck, IcAlerta, IcChispa, IcAtras } from "@/components/iconos";
import { TextureButton } from "@/components/ui/texture-button";
import { api, soles, type Situacion } from "@/lib/cliente-api";

export interface PlanElegido { nCuotas: number; inicial: number; fechaPrimerPago: string }

export default function Simulador({ sit, onContinuar, onVolver }: { sit: Situacion; onContinuar: (plan: PlanElegido, resultado: string, total: number) => void; onVolver: () => void }) {
  const lim = sit.limites!;
  const deuda = lim.deuda;
  const maxSlider = Math.max(lim.maxCuotas + 2, 4);
  const [nCuotas, setN] = useState(lim.maxCuotas);
  const [inicial, setInicial] = useState(Math.ceil(lim.inicialMin));
  const [fecha, setFecha] = useState(lim.primerPagoMin);
  const [r, setR] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      api("/api/simular", { clienteId: sit.cliente.id, nCuotas, inicial, fechaPrimerPago: fecha }).then((x) => { setR(x); setError(""); }).catch((e) => setError(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [nCuotas, inicial, fecha, sit.cliente.id]);

  const v = r?.validacion;
  const verde = v?.semaforo === "verde";
  const puede = v && (v.resultado === "automatica" || v.resultado === "derivada");

  return (
    <section className="space-y-4">
      <button onClick={onVolver} className="-ml-2 flex min-h-[44px] items-center gap-0.5 text-[17px] text-[#0A84FF]"><IcAtras tam={22} />Volver</button>
      <div className="card space-y-5">
        <div>
          <h2 className="flex items-center gap-2 text-[22px] font-bold tracking-[-0.02em]"><FichaApp icono={IcCalculadora} color="sol" tam={34} />Arma tu plan, a tu ritmo</h2>
          <p className="text-sm text-gray-600">Mueve los controles y mira al toque cómo queda. Hoy debes <b>{soles(deuda)}</b>.</p>
        </div>

        <label className="block">
          <div className="flex justify-between text-sm font-semibold"><span>Número de cuotas</span><span className="text-caja text-lg">{nCuotas}</span></div>
          <input type="range" min={1} max={maxSlider} step={1} value={nCuotas} onChange={(e) => setN(Number(e.target.value))} />
          <div className="flex justify-between text-xs text-gray-500"><span>1</span><span>{maxSlider}</span></div>
        </label>

        <label className="block">
          <div className="flex justify-between text-sm font-semibold"><span>Pago inicial (hoy)</span><span className="text-caja text-lg">{soles(inicial)}</span></div>
          <input type="range" min={0} max={Math.ceil(deuda)} step={10} value={inicial} onChange={(e) => setInicial(Number(e.target.value))} />
          <div className="flex justify-between text-xs text-gray-500"><span>S/ 0</span><span>{soles(deuda)}</span></div>
        </label>

        <label className="block text-sm font-semibold">
          Fecha de tu primera cuota
          <input type="date" value={fecha} min={lim.primerPagoMin} max={lim.primerPagoMax} onChange={(e) => setFecha(e.target.value || lim.primerPagoMin)}
            className="mt-1 w-full min-h-[48px] rounded-xl border border-caja-borde px-3 font-normal" />
        </label>
      </div>

      {error && <p className="card text-red-700 text-sm">{error}</p>}

      {v && (
        <div className={`rounded-tarjeta border p-4 ${verde ? "bg-green-50 border-green-300" : "bg-amber-50 border-amber-300"}`} role="status">
          <p className="flex items-start gap-2 font-semibold">{verde ? <IcCheck tam={20} className="mt-0.5 text-[#1DA851]" /> : <IcAlerta tam={20} className="mt-0.5 text-[#FF9F0A]" />}<span>{v.mensaje}</span></p>
          {v.motivos.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm space-y-1">{v.motivos.map((m: string) => <li key={m}>{m}</li>)}</ul>
          )}
          {v.contrapropuesta && (
            <TextureButton variant="accent" className="mt-3" onClick={() => { setN(v.contrapropuesta.nCuotas || 1); setInicial(v.contrapropuesta.inicial); setFecha(v.contrapropuesta.fechaPrimerPago); }}>
              <IcChispa tam={18} />Usar esta alternativa: {v.contrapropuesta.nCuotas} cuota{v.contrapropuesta.nCuotas === 1 ? "" : "s"}{v.contrapropuesta.inicial > 0 ? ` e inicial de ${soles(v.contrapropuesta.inicial)}` : ""}
            </TextureButton>
          )}
        </div>
      )}

      {r && (
        <div className="card">
          <h3 className="font-bold mb-2">Tu cronograma</h3>
          <ul className="divide-y divide-caja-borde text-sm">
            {r.cronograma.pagos.map((p: any) => (
              <li key={p.n} className="flex justify-between py-2">
                <span>{p.tipo === "inicial" ? "Inicial · hoy" : `Cuota ${p.n} · ${p.fechaLarga}`}</span><b>{soles(p.monto)}</b>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t border-caja-borde pt-2 mt-1 font-bold"><span>Total a pagar</span><span>{soles(r.total)}</span></p>
          <p className="text-xs text-gray-500 mt-1">Incluye tu deuda vencida y el interés moratorio a hoy. Sin costos extra por reprogramar. Ojo: el plan arranca con tu primer pago.</p>
        </div>
      )}

      <TextureButton size="lg" disabled={!puede} onClick={() => onContinuar({ nCuotas, inicial, fechaPrimerPago: fecha }, v.resultado, r.total)}>
        Continuar →
      </TextureButton>
    </section>
  );
}
