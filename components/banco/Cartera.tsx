"use client";
// Cartera del gestor en su propia página: búsqueda (nombre, DNI o negocio), filtros y tabla.
import { memo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { IcBillete, IcGestor } from "@/components/iconos";
import { soles } from "@/lib/cliente-api";
import { usarDebounce } from "@/lib/usar-polling";
import { MarcoGestor } from "./MarcoGestor";
import { COLOR_ESTADO, consulta, ETIQ_ESTADO, FILTROS_VACIOS, SelectoresFiltros, usarDatos, type Filtros, type OpcionesFiltros } from "./comun";

export default function Cartera() {
  const router = useRouter();
  const [f, setF] = useState<Filtros>(FILTROS_VACIOS);
  const [q, setQ] = useState("");
  const qDebounced = usarDebounce(q, 300);
  const { datos } = usarDatos<{ filas: any[]; filtros: OpcionesFiltros }>(`/api/banco/cartera?${consulta({ ...f, q: qDebounced })}`, 20000);
  const abrir = useCallback((id: number) => router.push(`/banco/cliente/${id}`), [router]);
  const filas = datos?.filas ?? [];

  return (
    <MarcoGestor>
      <section className="card space-y-3">
        <h1 className="text-xl font-bold text-caja">Cartera ({filas.length})</h1>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <input aria-label="Buscar" placeholder="Buscar nombre, DNI o negocio" value={q} onChange={(e) => setQ(e.target.value)} className="col-span-2 min-h-[44px] rounded-xl border border-caja-borde px-3 md:col-span-1" />
          {datos && <SelectoresFiltros f={f} setF={setF} op={datos.filtros} />}
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 bg-white"><tr className="border-b border-caja-borde text-left text-gray-600"><th className="py-2">Cliente</th><th>Negocio / zona</th><th>Crédito</th><th className="text-right">Atraso</th><th className="text-right">Deuda</th><th className="text-center">Score</th><th>Estado</th></tr></thead>
            <tbody>{filas.map((c) => <FilaCartera key={c.id} c={c} onAbrir={abrir} />)}</tbody>
          </table>
        </div>
      </section>
    </MarcoGestor>
  );
}

/** Fila de la cartera memoizada: solo se vuelve a pintar si cambian sus datos. */
const FilaCartera = memo(function FilaCartera({ c, onAbrir }: { c: any; onAbrir: (id: number) => void }) {
  return (
    <tr className="cursor-pointer border-b border-caja-borde/60 hover:bg-caja-fondo" onClick={() => onAbrir(c.id)}>
      <td className="py-2"><b>{c.nombres}</b><br /><span className="text-xs text-gray-500">DNI {c.dni}</span></td>
      <td>{c.negocio}<br /><span className="text-xs text-gray-500">{c.zona}</span></td>
      <td>{c.tipoCredito}</td>
      <td className="text-right">{c.diasAtraso > 0 ? `${c.diasAtraso} d` : "—"}</td>
      <td className="text-right">{c.deuda > 0 ? soles(c.deuda) : "—"}</td>
      <td className="text-center">{c.score} <span className="text-xs text-gray-500">{c.nivel}</span></td>
      <td><span className={`rounded-full px-2 py-1 text-xs ${COLOR_ESTADO[c.estado]}`}>{ETIQ_ESTADO[c.estado]}</span>{c.pideAyuda && <IcGestor tam={14} className="ml-1 inline text-neutral-500" aria-label="Pidió ayuda" />}{c.regaloVigente && <IcBillete tam={14} className="ml-1 inline text-caja" aria-label="Modo Rescate vigente" />}</td>
    </tr>
  );
});
