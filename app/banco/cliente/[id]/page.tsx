"use client";
import { use, useCallback, useEffect, useState } from "react";
import { usarPolling } from "@/lib/usar-polling";
import { IcBillete, IcCheck, IcReloj } from "@/components/iconos";
import Link from "next/link";
import { api, soles } from "@/lib/cliente-api";
import { TextureButton } from "@/components/ui/texture-button";
import { MarcoGestor } from "@/components/banco/MarcoGestor";

const MOTIVOS: Record<string, string> = { olvido: "Olvido", bajaron_ventas: "Bajaron las ventas", salud: "Salud", otro: "Otro" };

export default function DetalleCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  async function darRegalo() {
    try { await api("/api/banco/regalo", { clienteId: Number(id) }); setAviso("Modo Rescate activado. El cliente ya lo ve en su app."); setD(await api(`/api/banco/cliente/${id}`)); }
    catch (e: any) { setAviso(e.message); }
  }
  const cargar = useCallback(() => api(`/api/banco/cliente/${id}`).then(setD).catch((e) => setError(e.message)), [id]);
  useEffect(() => { cargar(); }, [cargar]);
  usarPolling(cargar, 5000); // pausado con la pestaña en segundo plano
  if (error) return <MarcoGestor><p className="text-red-700">{error}</p></MarcoGestor>;
  if (!d) return <MarcoGestor><p>Cargando…</p></MarcoGestor>;
  return (
    <MarcoGestor>
      <Link href="/banco/cartera" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-caja-medio underline">Volver a la cartera</Link>
      <section className="card">
        <h1 className="text-2xl font-bold text-caja">{d.cliente.nombres}</h1>
        <p className="text-sm text-gray-600">DNI {d.cliente.dni} · {d.cliente.negocio} · {d.cliente.zona} · tel. {d.cliente.telefono}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
          <div><p className="text-gray-600">Estado</p><b>{d.estado}</b></div>
          <div><p className="text-gray-600">Atraso</p><b>{d.diasAtraso} días</b></div>
          <div><p className="text-gray-600">Deuda hoy</p><b>{soles(d.deuda.total)}</b></div>
          <div><p className="text-gray-600">Score</p><b>{d.cliente.score} · {d.cliente.nivel}</b></div>
          <div><p className="text-gray-600">Crédito</p><b>{d.credito.tipo}</b></div>
          <div><p className="text-gray-600">Cuota mensual</p><b>{soles(d.credito.cuotaMensual)}</b></div>
          <div><p className="text-gray-600">Saldo capital</p><b>{soles(d.credito.saldoCapital)}</b></div>
          <div><p className="text-gray-600">TEA</p><b>{Math.round(d.credito.tea * 100)}%</b></div>
        </div>
      </section>

      <section className="card space-y-2 border-[#B9D3F0]">
        <h2 className="flex items-center gap-2 font-bold text-[#0047AB]"><IcBillete tam={18} />Modo Rescate (campaña de regularización)</h2>
        {d.cliente.sinBeneficios && <p className="text-sm rounded-xl bg-rose-50 border border-rose-200 p-2">Incumplió un plan: está <b>sin beneficios</b> y no puede reprogramar. Solo una campaña lo reactiva.</p>}
        {d.regaloVigente && (
          <p className="text-sm">Vigente hasta el {d.regaloVigente.venceLargo}: paga <b>{soles(d.regaloVigente.montoHoy)}</b> hoy (en vez de {soles(d.regaloVigente.base)}) y recupera {soles(d.regaloVigente.descuento)} con recargos de {d.regaloVigente.recargos.map((r: any) => soles(r.monto)).join(" + ")}.</p>
        )}
        {d.puedeRecibirRegalo && d.vistaPreviaRegalo && (
          <>
            <p className="text-sm">Si se lo otorgas: paga <b>{soles(d.vistaPreviaRegalo.montoHoy)}</b> hoy (−{soles(d.vistaPreviaRegalo.descuento)}) y +{soles(d.vistaPreviaRegalo.recargos[0].monto)} en sus 3 cuotas siguientes. Vence en 7 días.</p>
            <TextureButton variant="regalo" className="md:w-auto" onClick={darRegalo}><IcBillete tam={18} />Activar Modo Rescate</TextureButton>
          </>
        )}
        {!d.puedeRecibirRegalo && !d.regaloVigente && <p className="text-sm text-gray-500">No aplica ahora (el cliente no está en mora o tiene un plan en marcha).</p>}
        {aviso && <p className="text-sm font-semibold text-[#0047AB]">{aviso}</p>}
        {d.campanas.length > 0 && <p className="text-xs text-gray-500">Historial: {d.campanas.map((c: any) => `${c.estado} (${soles(c.montoHoy)})`).join(" · ")}</p>}
      </section>

      <section className="card">
        <h2 className="font-bold text-caja mb-2">Propuestas</h2>
        {d.propuestas.length === 0 && <p className="text-sm text-gray-500">Aún no ha enviado una propuesta.</p>}
        {d.propuestas.map((p: any) => (
          <div key={p.id} className="border border-caja-borde rounded-xl p-3 mb-2 text-sm">
            <p><b>{p.estado.toUpperCase()}</b> · {p.nCuotas} cuota(s) · inicial {soles(p.inicial)} · total {soles(p.total)} · motivo del atraso: <b>{MOTIVOS[p.motivo] ?? "—"}</b></p>
            <ul className="mt-1 text-gray-700">{p.pagos.map((x: any) => <li key={x.n} className="flex items-center gap-1.5">{x.pagado ? <IcCheck tam={14} className="text-[#34C759]" /> : <IcReloj tam={14} className="text-neutral-400" />}{x.tipo === "inicial" ? "Inicial" : `Cuota ${x.n}`} · {x.fechaLarga} · {soles(x.monto)}</li>)}</ul>
          </div>
        ))}
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card">
          <h2 className="font-bold text-caja mb-2">Línea de tiempo</h2>
          <ul className="divide-y divide-caja-borde text-sm max-h-96 overflow-y-auto">
            {d.eventos.map((e: any) => <li key={e.id} className="py-2 flex justify-between gap-2"><span>{e.texto}</span><span className="text-xs text-gray-500 whitespace-nowrap">{new Date(e.creadoEn).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</span></li>)}
          </ul>
        </section>
        <section className="card">
          <h2 className="font-bold text-caja mb-2">Historial de score</h2>
          <ul className="divide-y divide-caja-borde text-sm max-h-96 overflow-y-auto">
            {d.historialScore.map((m: any) => <li key={m.id} className="py-2 flex justify-between gap-2"><span>{m.detalle} <span className="text-xs text-gray-500">({m.tipo})</span></span><b className={m.puntos < 0 ? "text-red-700" : "text-green-700"}>{m.puntos > 0 ? "+" : ""}{m.puntos} → {m.saldo_resultante}</b></li>)}
          </ul>
        </section>
      </div>
    </MarcoGestor>
  );
}
