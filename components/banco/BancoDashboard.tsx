"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { usarDebounce, usarPolling } from "@/lib/usar-polling";
import { IcEnVivo, IcGestor, IcRegalo } from "@/components/iconos";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APP_NOMBRE } from "@/lib/config";
import { api, soles } from "@/lib/cliente-api";
import { TextureButton } from "@/components/ui/texture-button";

const ETIQ_ESTADO: Record<string, string> = { en_mora: "En mora", plan_pendiente: "Plan sin 1er pago", reprogramado: "Plan en marcha", incumplido: "Incumplió (sin beneficios)", derivado: "Derivado a gestor", al_dia: "Al día" };
const COLOR_ESTADO: Record<string, string> = { en_mora: "bg-amber-100", plan_pendiente: "bg-sky-100", reprogramado: "bg-green-100", incumplido: "bg-rose-200", derivado: "bg-red-100", al_dia: "bg-blue-100" };

const FEED_MS = 3000; // feed incremental (barato)
const RESPALDO_MS = 20000; // KPIs/derivados/cartera si no llegan eventos (p. ej. al pasar un día)

/** Reutiliza las filas que no cambiaron para que React.memo evite re-renderizarlas. */
function reconciliar<T extends { id: number }>(prev: T[], next: T[]): T[] {
  const porId = new Map(prev.map((x) => [x.id, x]));
  let igual = prev.length === next.length;
  const out = next.map((x, i) => {
    const p = porId.get(x.id);
    const mismo = p && JSON.stringify(p) === JSON.stringify(x);
    if (!mismo || prev[i] !== p) igual = false;
    return mismo ? p! : x;
  });
  return igual ? prev : out;
}

function hace(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  return s < 60 ? `hace ${s} s` : s < 3600 ? `hace ${Math.floor(s / 60)} min` : `hace ${Math.floor(s / 3600)} h`;
}

export default function BancoDashboard() {
  const router = useRouter();
  const [kpis, setKpis] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const ultimo = useRef(0);
  const [cartera, setCartera] = useState<any>({ filas: [], filtros: { zonas: [], tipos: [], tramos: [], estados: [] } });
  const [derivados, setDerivados] = useState<any[]>([]);
  const [f, setF] = useState({ q: "", tramo: "", tipo: "", estado: "", zona: "" });
  const qDebounced = usarDebounce(f.q, 300);
  const [aviso, setAviso] = useState("");
  const [version, setVersion] = useState(0); // sube cuando el feed trae eventos nuevos

  const darRegalo = useCallback(async (id: number, nombre: string) => {
    try { const r = await api("/api/banco/regalo", { clienteId: id }); setAviso(`Regalo Salvador otorgado a ${nombre}: paga ${soles(r.regalo.montoHoy)} hoy.`); setVersion((v) => v + 1); }
    catch (e: any) { setAviso(e.message); }
    setTimeout(() => setAviso(""), 5000);
  }, []);
  const abrir = useCallback((id: number) => router.push(`/banco/cliente/${id}`), [router]);
  const sinSesion = useCallback((e: any) => { if (String(e?.message).includes("Sesión")) router.push("/banco/login"); }, [router]);

  // 1) Feed incremental cada 3 s (solo trae lo nuevo). Si hay eventos nuevos, pide refrescar lo demás.
  const leerFeed = useCallback(async () => {
    try {
      const fd = await api(`/api/banco/feed?desde=${ultimo.current}`);
      if (fd.items.length) setFeed((prev) => [...fd.items.reverse(), ...prev].slice(0, 40));
      if (fd.ultimoId !== ultimo.current) { const primera = ultimo.current === 0; ultimo.current = fd.ultimoId; if (!primera) setVersion((v) => v + 1); }
    } catch (e) { sinSesion(e); }
  }, [sinSesion]);
  useEffect(() => { leerFeed(); }, [leerFeed]);
  usarPolling(leerFeed, FEED_MS);

  // 2) KPIs + derivados en una sola petición: al inicio, cuando hay eventos nuevos y de respaldo cada 20 s
  const leerResumen = useCallback(async () => {
    try {
      const r = await api("/api/banco/resumen");
      setKpis((prev: any) => (JSON.stringify(prev) === JSON.stringify(r.kpis) ? prev : r.kpis));
      setDerivados((prev) => reconciliar(prev, r.derivados));
    } catch (e) { sinSesion(e); }
  }, [sinSesion]);
  useEffect(() => { leerResumen(); }, [leerResumen, version]);
  usarPolling(leerResumen, RESPALDO_MS);

  // 3) Cartera filtrada: con la búsqueda en debounce (300 ms), cuando hay eventos nuevos y de respaldo cada 20 s
  const qs = new URLSearchParams(Object.entries({ ...f, q: qDebounced }).filter(([, v]) => v)).toString();
  const leerCartera = useCallback(async () => {
    try {
      const c = await api(`/api/banco/cartera?${qs}`);
      setCartera((prev: any) => {
        const filas = reconciliar(prev.filas, c.filas);
        const filtros = JSON.stringify(prev.filtros) === JSON.stringify(c.filtros) ? prev.filtros : c.filtros;
        return filas === prev.filas && filtros === prev.filtros ? prev : { filas, filtros };
      });
    } catch (e) { sinSesion(e); }
  }, [qs, sinSesion]);
  useEffect(() => { leerCartera(); }, [leerCartera, version]);
  usarPolling(leerCartera, RESPALDO_MS);

  const kpi = (titulo: string, valor: string | number, nota?: string) => (
    <div className="card"><p className="text-xs text-gray-600">{titulo}</p><p className="text-2xl font-bold text-caja">{valor}</p>{nota && <p className="text-xs text-gray-500">{nota}</p>}</div>
  );

  return (
    <main className="max-w-6xl mx-auto pb-16">
      <header className="bg-caja-header text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold">{APP_NOMBRE} · Panel del gestor</span>
        <button className="text-sm underline min-h-[44px]" onClick={async () => { await fetch("/api/banco/login", { method: "DELETE" }); router.push("/banco/login"); }}>Salir</button>
      </header>

      <div className="px-4 pt-4 space-y-5">
        {aviso && <p className="rounded-2xl bg-fuchsia-50 border border-fuchsia-200 p-3 text-sm font-semibold sticky top-14 z-10">{aviso}</p>}
        {kpis && (
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {kpi("Avisos enviados", kpis.avisosEnviados)}
            {kpi("Módulos abiertos", kpis.modulosAbiertos, `${Math.round((kpis.modulosAbiertos / Math.max(1, kpis.avisosEnviados)) * 100)}% de los avisos`)}
            {kpi("Propuestas aceptadas", kpis.propuestasAceptadas, `${kpis.propuestasDerivadas} derivadas a gestor`)}
            {kpi("Monto comprometido", soles(kpis.montoComprometido))}
            {kpi("Promesas cumplidas", kpis.tasaPromesaCumplida === null ? "—" : `${kpis.tasaPromesaCumplida}%`, "de las ya resueltas")}
            {kpi("Cartera en mora", kpis.carteraEnMora, soles(kpis.deudaEnMora))}
            {kpi("Reprogramados", kpis.reprogramados)}
            {kpi("Casos para gestor", kpis.derivados, `${kpis.incumplidos} incumplieron su plan`)}
            {kpi("Regalos Salvador", kpis.regalosOtorgados, `${kpis.regalosUsados} ya usados`)}
          </section>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <PanelFeed feed={feed} />

          <section className="card">
            <h2 className="mb-2 flex items-center gap-2 font-bold text-caja"><IcGestor tam={18} />Casos derivados a gestor ({derivados.length})</h2>
            <ul className="divide-y divide-caja-borde text-sm max-h-72 overflow-y-auto">
              {derivados.length === 0 && <li className="py-2 text-gray-500">Sin casos pendientes.</li>}
              {derivados.map((d) => (
                <li key={d.id} className="py-2">
                  <Link href={`/banco/cliente/${d.id}`} className="font-semibold underline">{d.nombres}</Link>
                  <span className="text-gray-600"> · {d.diasAtraso} días · {soles(d.deuda)}</span>
                  <p className="text-xs text-gray-600">{d.motivos.join(" · ")}{d.propuesta ? ` · propuesta: ${d.propuesta.nCuotas} cuotas` : ""}</p>
                  {d.puedeRecibirRegalo && <TextureButton variant="regalo" size="sm" className="mt-1 w-auto" onClick={() => darRegalo(d.id, d.nombres)}><IcRegalo tam={16} />Dar Regalo Salvador</TextureButton>}
                  {d.regaloVigente && <span className="flex items-center gap-1 text-xs font-semibold text-fuchsia-700"><IcRegalo tam={14} />Regalo vigente</span>}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card space-y-3">
          <h2 className="font-bold text-caja">Cartera ({cartera.filas.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <input placeholder="Buscar nombre, DNI o negocio" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} className="col-span-2 md:col-span-1 min-h-[44px] rounded-xl border border-caja-borde px-3" />
            <Sel valor={f.tramo} onChange={(v) => setF({ ...f, tramo: v })} vacio="Todos los tramos" opciones={cartera.filtros.tramos.map((t: string) => [t, t === "al_dia" ? "Al día" : `${t} días`])} />
            <Sel valor={f.tipo} onChange={(v) => setF({ ...f, tipo: v })} vacio="Todo tipo de crédito" opciones={cartera.filtros.tipos.map((t: string) => [t, t])} />
            <Sel valor={f.estado} onChange={(v) => setF({ ...f, estado: v })} vacio="Todos los estados" opciones={cartera.filtros.estados.map((t: string) => [t, ETIQ_ESTADO[t]])} />
            <Sel valor={f.zona} onChange={(v) => setF({ ...f, zona: v })} vacio="Todas las zonas" opciones={cartera.filtros.zonas.map((t: string) => [t, t])} />
          </div>
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="sticky top-0 bg-white"><tr className="text-left text-gray-600 border-b border-caja-borde"><th className="py-2">Cliente</th><th>Negocio / zona</th><th>Crédito</th><th className="text-right">Atraso</th><th className="text-right">Deuda</th><th className="text-center">Score</th><th>Estado</th></tr></thead>
              <tbody>
                {cartera.filas.map((c: any) => <FilaCartera key={c.id} c={c} onAbrir={abrir} />)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Sel({ valor, onChange, vacio, opciones }: { valor: string; onChange: (v: string) => void; vacio: string; opciones: [string, string][] }) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)} className="min-h-[44px] rounded-xl border border-caja-borde px-2 bg-white">
      <option value="">{vacio}</option>
      {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );
}

/** Feed en tiempo real con su propio reloj para los "hace N s": no re-renderiza el resto del panel. */
const PanelFeed = memo(function PanelFeed({ feed }: { feed: any[] }) {
  const [, tick] = useState(0);
  usarPolling(() => tick((x) => x + 1), 5000);
  return (
    <section className="card">
      <h2 className="mb-2 flex items-center gap-2 font-bold text-caja"><IcEnVivo tam={18} className="text-[#FF3B30]" />En tiempo real</h2>
      <ul className="divide-y divide-caja-borde text-sm max-h-72 overflow-y-auto">
        {feed.length === 0 && <li className="py-2 text-gray-500">Esperando actividad…</li>}
        {feed.map((e) => (
          <li key={e.id} className="py-2 flex justify-between gap-2">
            <Link href={`/banco/cliente/${e.clienteId}`} className={e.tipo === "propuesta_enviada" || e.tipo === "pago_simulado" ? "font-semibold" : ""}>{e.texto}</Link>
            <span className="text-xs text-gray-500 whitespace-nowrap">{hace(e.creadoEn)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
});

/** Fila de la cartera memoizada: solo se vuelve a pintar si cambian sus datos. */
const FilaCartera = memo(function FilaCartera({ c, onAbrir }: { c: any; onAbrir: (id: number) => void }) {
  return (
    <tr className="border-b border-caja-borde/60 hover:bg-caja-fondo cursor-pointer" onClick={() => onAbrir(c.id)}>
      <td className="py-2"><b>{c.nombres}</b><br /><span className="text-xs text-gray-500">DNI {c.dni}</span></td>
      <td>{c.negocio}<br /><span className="text-xs text-gray-500">{c.zona}</span></td>
      <td>{c.tipoCredito}</td>
      <td className="text-right">{c.diasAtraso > 0 ? `${c.diasAtraso} d` : "—"}</td>
      <td className="text-right">{c.deuda > 0 ? soles(c.deuda) : "—"}</td>
      <td className="text-center">{c.score} <span className="text-xs text-gray-500">{c.nivel}</span></td>
      <td><span className={`rounded-full px-2 py-1 text-xs ${COLOR_ESTADO[c.estado]}`}>{ETIQ_ESTADO[c.estado]}</span>{c.pideAyuda && <IcGestor tam={14} className="ml-1 inline text-neutral-500" aria-label="Pidió ayuda" />}{c.regaloVigente && <IcRegalo tam={14} className="ml-1 inline text-fuchsia-600" aria-label="Regalo vigente" />}</td>
    </tr>
  );
});
