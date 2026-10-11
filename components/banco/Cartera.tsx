"use client";
// Cartera del gestor en su propia página: búsqueda (nombre, DNI o negocio), filtros y tabla.
import { memo, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IcBillete, IcCompartir, IcGestor, IcLista } from "@/components/iconos";
import { soles } from "@/lib/cliente-api";
import { usarDebounce } from "@/lib/usar-polling";
import { MarcoGestor } from "./MarcoGestor";
import { COLOR_ESTADO, consulta, ETIQ_ESTADO, FILTROS_VACIOS, SelectoresFiltros, usarDatos, type Filtros, type OpcionesFiltros } from "./comun";

export default function Cartera() {
  const router = useRouter();
  const [f, setF] = useState<Filtros>(FILTROS_VACIOS);
  const [q, setQ] = useState("");
  const qDebounced = usarDebounce(q, 300);
  const { datos, recargar } = usarDatos<{ filas: any[]; filtros: OpcionesFiltros }>(`/api/banco/cartera?${consulta({ ...f, q: qDebounced })}`, 20000);
  const abrir = useCallback((id: number) => router.push(`/banco/cliente/${id}`), [router]);
  const filas = datos?.filas ?? [];

  return (
    <MarcoGestor>
      <ExcelCartera onImportado={recargar} />
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

interface Resultado { filas: number; creados: number; actualizados: number; pagados: number; nuevaMora: number; errores: { fila: number; mensaje: string }[] }

/** Cargar la cartera desde Excel y descargarla con su estado (por ejemplo, para marcar quién ya pagó). */
function ExcelCartera({ onImportado }: { onImportado: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [res, setRes] = useState<Resultado | null>(null);
  const [error, setError] = useState("");

  async function subir(archivo: File) {
    setSubiendo(true); setError(""); setRes(null);
    try {
      const form = new FormData();
      form.append("archivo", archivo);
      const r = await fetch("/api/banco/excel", { method: "POST", body: form });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "No se pudo subir el archivo.");
      setRes(j); onImportado();
    } catch (e: any) { setError(e.message); }
    finally { setSubiendo(false); if (input.current) input.current.value = ""; }
  }

  const boton = "flex min-h-[44px] items-center gap-2 rounded-xl border border-caja-borde bg-white px-3 text-sm font-semibold text-caja hover:bg-[#EAF2FC]";
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-bold text-caja">Cartera en Excel</h2>
        <p className="text-sm text-gray-600">Suba un Excel para agregar clientes o actualizar los existentes (por ID sistema o DNI). Para registrar pagos, descargue la cartera, escriba <b>Sí</b> en “¿Ya pagó?” y vuelva a subirla.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href="/api/banco/excel?tipo=plantilla" className={boton}><IcLista tam={18} />Descargar plantilla</a>
        <a href="/api/banco/excel?tipo=cartera" className={boton}><IcCompartir tam={18} className="rotate-180" />Descargar cartera en Excel</a>
        <button onClick={() => input.current?.click()} disabled={subiendo} className="flex min-h-[44px] items-center gap-2 rounded-xl bg-caja px-4 text-sm font-semibold text-white hover:bg-caja-medio disabled:opacity-50">
          <IcCompartir tam={18} />{subiendo ? "Procesando…" : "Subir Excel"}
        </button>
        <input ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" aria-label="Archivo Excel de cartera"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); }} />
      </div>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
      {res && (
        <div role="status" className="rounded-xl border border-[#B9D3F0] bg-[#EAF2FC] p-3 text-sm text-caja">
          <p className="font-semibold">Listo: {res.filas} fila(s) leídas · {res.creados} cliente(s) nuevos · {res.actualizados} actualizados · {res.pagados} pago(s) registrados{res.nuevaMora ? ` · ${res.nuevaMora} con nueva mora` : ""}.</p>
          {res.errores.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer font-semibold text-rose-800">{res.errores.length} fila(s) con observaciones</summary>
              <ul className="mt-1 max-h-40 list-disc overflow-auto pl-5 text-rose-800">{res.errores.map((e) => <li key={e.fila}>Fila {e.fila}: {e.mensaje}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
