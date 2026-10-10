"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APP_NOMBRE } from "@/lib/config";
import { api, soles } from "@/lib/cliente-api";

const ETIQ_ESTADO: Record<string, string> = { en_mora: "En mora", reprogramado: "Reprogramado", derivado: "Derivado a gestor", al_dia: "Al día" };
const COLOR_ESTADO: Record<string, string> = { en_mora: "bg-amber-100", reprogramado: "bg-green-100", derivado: "bg-red-100", al_dia: "bg-blue-100" };

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
  const [, tick] = useState(0);

  // Tiempo real por polling cada 3 s (ROADMAP: Supabase Realtime)
  useEffect(() => {
    let vivo = true;
    const ciclo = async () => {
      try {
        const [k, fd, d] = await Promise.all([api("/api/banco/kpis"), api(`/api/banco/feed?desde=${ultimo.current}`), api("/api/banco/derivados")]);
        if (!vivo) return;
        setKpis(k); setDerivados(d);
        if (fd.items.length) setFeed((prev) => [...fd.items.reverse(), ...prev].slice(0, 40));
        ultimo.current = fd.ultimoId;
        tick((x) => x + 1);
      } catch (e: any) { if (String(e.message).includes("Sesión")) router.push("/banco/login"); }
    };
    ciclo();
    const id = setInterval(ciclo, 3000);
    return () => { vivo = false; clearInterval(id); };
  }, [router]);

  useEffect(() => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
    let vivo = true;
    const cargar = () => api(`/api/banco/cartera?${qs}`).then((c) => vivo && setCartera(c)).catch(() => {});
    cargar();
    const id = setInterval(cargar, 3000);
    return () => { vivo = false; clearInterval(id); };
  }, [f]);

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
        {kpis && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpi("Avisos enviados", kpis.avisosEnviados)}
            {kpi("Módulos abiertos", kpis.modulosAbiertos, `${Math.round((kpis.modulosAbiertos / Math.max(1, kpis.avisosEnviados)) * 100)}% de los avisos`)}
            {kpi("Propuestas aceptadas", kpis.propuestasAceptadas, `${kpis.propuestasDerivadas} derivadas a gestor`)}
            {kpi("Monto comprometido", soles(kpis.montoComprometido))}
            {kpi("Promesas cumplidas", kpis.tasaPromesaCumplida === null ? "—" : `${kpis.tasaPromesaCumplida}%`, "de las ya resueltas")}
            {kpi("Cartera en mora", kpis.carteraEnMora, soles(kpis.deudaEnMora))}
            {kpi("Reprogramados", kpis.reprogramados)}
            {kpi("Casos para gestor", kpis.derivados)}
          </section>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <section className="card">
            <h2 className="font-bold text-caja mb-2">⚡ En tiempo real</h2>
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

          <section className="card">
            <h2 className="font-bold text-caja mb-2">🧑‍💼 Casos derivados a gestor ({derivados.length})</h2>
            <ul className="divide-y divide-caja-borde text-sm max-h-72 overflow-y-auto">
              {derivados.length === 0 && <li className="py-2 text-gray-500">Sin casos pendientes.</li>}
              {derivados.map((d) => (
                <li key={d.id} className="py-2">
                  <Link href={`/banco/cliente/${d.id}`} className="font-semibold underline">{d.nombres}</Link>
                  <span className="text-gray-600"> · {d.diasAtraso} días · {soles(d.deuda)}</span>
                  <p className="text-xs text-gray-600">{d.motivos.join(" · ")}{d.propuesta ? ` · propuesta: ${d.propuesta.nCuotas} cuotas` : ""}</p>
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
                {cartera.filas.map((c: any) => (
                  <tr key={c.id} className="border-b border-caja-borde/60 hover:bg-caja-fondo cursor-pointer" onClick={() => router.push(`/banco/cliente/${c.id}`)}>
                    <td className="py-2"><b>{c.nombres}</b><br /><span className="text-xs text-gray-500">DNI {c.dni}</span></td>
                    <td>{c.negocio}<br /><span className="text-xs text-gray-500">{c.zona}</span></td>
                    <td>{c.tipoCredito}</td>
                    <td className="text-right">{c.diasAtraso > 0 ? `${c.diasAtraso} d` : "—"}</td>
                    <td className="text-right">{c.deuda > 0 ? soles(c.deuda) : "—"}</td>
                    <td className="text-center">{c.score} <span className="text-xs text-gray-500">{c.nivel}</span></td>
                    <td><span className={`rounded-full px-2 py-1 text-xs ${COLOR_ESTADO[c.estado]}`}>{ETIQ_ESTADO[c.estado]}</span>{c.pideAyuda && " 🙋"}</td>
                  </tr>
                ))}
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
