"use client";
// Resumen del panel del gestor: KPIs, gráfico de la cartera y casos derivados.
import { memo, useCallback, useState } from "react";
import Link from "next/link";
import { IcBillete, IcGestor } from "@/components/iconos";
import { api, soles } from "@/lib/cliente-api";
import { TextureButton } from "@/components/ui/texture-button";
import { MarcoGestor } from "./MarcoGestor";
import { GraficoCartera } from "./GraficoCartera";
import { usarDatos } from "./comun";

export function AvisoGestor({ texto }: { texto: string }) {
  if (!texto) return null;
  return <p role="status" className="sticky top-16 z-10 rounded-2xl border border-[#B9D3F0] bg-[#EAF2FC] p-3 text-sm font-semibold text-caja">{texto}</p>;
}

export default function BancoDashboard() {
  const { datos, recargar } = usarDatos<{ kpis: any; derivados: any[] }>("/api/banco/resumen", 5000);
  const [aviso, setAviso] = useState("");
  const kpis = datos?.kpis;

  const darRescate = useCallback(async (id: number, nombre: string) => {
    try { const r = await api("/api/banco/regalo", { clienteId: id }); setAviso(`Modo Rescate activado a ${nombre}: paga ${soles(r.regalo.montoHoy)} hoy.`); recargar(); }
    catch (e: any) { setAviso(e.message); }
    setTimeout(() => setAviso(""), 5000);
  }, [recargar]);

  const kpi = (titulo: string, valor: string | number, nota?: string) => (
    <div className="card"><p className="text-xs text-gray-600">{titulo}</p><p className="text-2xl font-bold text-caja">{valor}</p>{nota && <p className="text-xs text-gray-500">{nota}</p>}</div>
  );

  return (
    <MarcoGestor>
      <AvisoGestor texto={aviso} />
      {kpis && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {kpi("Avisos enviados", kpis.avisosEnviados)}
          {kpi("Módulos abiertos", kpis.modulosAbiertos, `${Math.round((kpis.modulosAbiertos / Math.max(1, kpis.avisosEnviados)) * 100)}% de los avisos`)}
          {kpi("Propuestas aceptadas", kpis.propuestasAceptadas, `${kpis.propuestasDerivadas} derivadas a gestor`)}
          {kpi("Monto comprometido", soles(kpis.montoComprometido))}
          {kpi("Promesas cumplidas", kpis.tasaPromesaCumplida === null ? "—" : `${kpis.tasaPromesaCumplida}%`, "de las ya resueltas")}
          {kpi("Cartera en mora", kpis.carteraEnMora, soles(kpis.deudaEnMora))}
          {kpi("Reprogramados", kpis.reprogramados)}
          {kpi("Casos para gestor", kpis.derivados, `${kpis.incumplidos} incumplieron su plan`)}
          {kpi("Modo Rescate", kpis.regalosOtorgados, `${kpis.regalosUsados} ya usados`)}
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <GraficoCartera />
        <Derivados lista={datos?.derivados ?? []} onRescate={darRescate} />
      </div>
    </MarcoGestor>
  );
}

const Derivados = memo(function Derivados({ lista, onRescate }: { lista: any[]; onRescate: (id: number, nombre: string) => void }) {
  return (
    <section className="card">
      <h2 className="mb-2 flex items-center gap-2 font-bold text-caja"><IcGestor tam={18} />Casos derivados a gestor ({lista.length})</h2>
      <ul className="max-h-[26rem] divide-y divide-caja-borde overflow-y-auto text-sm">
        {lista.length === 0 && <li className="py-2 text-gray-500">Sin casos pendientes.</li>}
        {lista.map((d) => (
          <li key={d.id} className="py-2">
            <Link href={`/banco/cliente/${d.id}`} className="font-semibold underline">{d.nombres}</Link>
            <span className="text-gray-600"> · {d.diasAtraso} días · {soles(d.deuda)}</span>
            <p className="text-xs text-gray-600">{d.motivos.join(" · ")}{d.propuesta ? ` · propuesta: ${d.propuesta.nCuotas} cuotas` : ""}</p>
            {d.puedeRecibirRegalo && <TextureButton variant="regalo" size="sm" className="mt-1 w-auto" onClick={() => onRescate(d.id, d.nombres)}><IcBillete tam={16} />Activar Modo Rescate</TextureButton>}
            {d.regaloVigente && <span className="flex items-center gap-1 text-xs font-semibold text-caja"><IcBillete tam={14} />Modo Rescate vigente</span>}
          </li>
        ))}
      </ul>
    </section>
  );
});
