"use client";
// Campañas de Modo Rescate: masivas por rango de puntos o individuales buscando al cliente por DNI o nombre.
import { useCallback, useState } from "react";
import Link from "next/link";
import { FichaApp, IcBillete } from "@/components/iconos";
import { api, soles } from "@/lib/cliente-api";
import { REGALO_SALVADOR } from "@/lib/reglas";
import { usarDebounce } from "@/lib/usar-polling";
import { TextureButton } from "@/components/ui/texture-button";
import { MarcoGestor } from "./MarcoGestor";
import { AvisoGestor } from "./BancoDashboard";
import { consulta, ETIQ_ESTADO, usarDatos } from "./comun";

interface Rango { id: string; min: number; max: number; elegibles: number; conRescate: number; deuda: number }

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function ModoRescate() {
  const { datos, recargar } = usarDatos<{ rangos: Rango[] }>("/api/banco/rescate", 10000);
  const [aviso, setAviso] = useState("");
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [q, setQ] = useState("");
  const qDebounced = usarDebounce(q.trim(), 300);
  const busqueda = usarDatos<{ filas: any[] }>(qDebounced.length >= 2 ? `/api/banco/cartera?${consulta({ q: qDebounced })}` : "", 20000);

  const avisar = (t: string) => { setAviso(t); setTimeout(() => setAviso(""), 6000); };

  async function masivo(r: Rango) {
    if (confirmar !== r.id) { setConfirmar(r.id); setTimeout(() => setConfirmar((x) => (x === r.id ? null : x)), 4000); return; }
    setConfirmar(null); setEnviando(true);
    try {
      const res = await api<{ otorgados: number; omitidos: number }>("/api/banco/rescate", { rango: r.id });
      avisar(`Modo Rescate activado a ${res.otorgados} cliente(s) con ${r.min}–${r.max} puntos.${res.omitidos ? ` ${res.omitidos} no aplicaban.` : ""}`);
      recargar(); busqueda.recargar();
    } catch (e: any) { avisar(e.message); }
    finally { setEnviando(false); }
  }

  const individual = useCallback(async (id: number, nombre: string) => {
    try { const r = await api("/api/banco/regalo", { clienteId: id }); avisar(`Modo Rescate activado a ${nombre}: paga ${soles(r.regalo.montoHoy)} hoy.`); recargar(); busqueda.recargar(); }
    catch (e: any) { avisar(e.message); }
  }, [recargar, busqueda]);

  const filas = qDebounced.length >= 2 ? (busqueda.datos?.filas ?? []).slice(0, 10) : [];

  return (
    <MarcoGestor>
      <AvisoGestor texto={aviso} />

      <section className="overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0072C6] via-[#0047AB] to-[#00347A] p-5 text-white">
        <div className="flex items-center gap-3">
          <FichaApp icono={IcBillete} color="rescate" tam={48} className="ring-2 ring-white/30" />
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/80">Campañas de regularización</p>
            <h1 className="text-2xl font-bold leading-tight">Modo Rescate</h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-white/90">
          El cliente paga hoy un <b>{pct(REGALO_SALVADOR.descuentoPct)} menos</b> de lo vencido y recupera ese monto con <b>+{pct(REGALO_SALVADOR.recargoPct)}</b> en sus {REGALO_SALVADOR.meses} cuotas siguientes.
          La campaña vence en {REGALO_SALVADOR.vigenciaDias} días y, al usarla, el cliente se pone al día y recupera sus beneficios.
          Solo aplica a clientes en mora sin un plan en marcha ni un Modo Rescate vigente.
        </p>
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="font-bold text-caja">Campaña masiva por puntos</h2>
          <p className="text-sm text-gray-600">Elija el rango de score: se activa a todos los clientes elegibles de ese rango.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(datos?.rangos ?? []).map((r) => (
            <div key={r.id} className="flex flex-col rounded-2xl border border-caja-borde bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Score</p>
              <p className="text-2xl font-bold text-caja tabular-nums">{r.min}–{r.max} pts</p>
              <p className="mt-1 text-sm"><b className="tabular-nums">{r.elegibles}</b> cliente(s) elegibles</p>
              <p className="text-xs text-gray-500">{r.elegibles ? `Deuda vencida ${soles(r.deuda)}` : "Nadie para activar"}{r.conRescate ? ` · ${r.conRescate} ya con Modo Rescate` : ""}</p>
              <TextureButton variant="regalo" size="sm" className="mt-3" disabled={!r.elegibles || enviando} onClick={() => masivo(r)}>
                <IcBillete tam={16} />{!r.elegibles ? "Sin clientes elegibles" : confirmar === r.id ? `Confirmar: activar a ${r.elegibles}` : `Activar a ${r.elegibles}`}
              </TextureButton>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="font-bold text-caja">Campaña individual</h2>
          <p className="text-sm text-gray-600">Busque al cliente por DNI o por nombre.</p>
        </div>
        <input aria-label="Buscar cliente por DNI o nombre" placeholder="DNI o nombre del cliente" value={q} onChange={(e) => setQ(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-caja-borde px-3 md:max-w-md" />
        {qDebounced.length >= 2 && (
          <ul className="divide-y divide-caja-borde text-sm">
            {filas.length === 0 && <li className="py-2 text-gray-500">No se encontraron clientes.</li>}
            {filas.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <Link href={`/banco/cliente/${c.id}`} className="font-semibold underline">{c.nombres}</Link>
                  <p className="text-xs text-gray-600">DNI {c.dni} · score {c.score} · {ETIQ_ESTADO[c.estado]}{c.diasAtraso > 0 ? ` · ${c.diasAtraso} días · ${soles(c.deuda)}` : ""}</p>
                </div>
                {c.regaloVigente ? <span className="flex items-center gap-1 text-xs font-semibold text-caja"><IcBillete tam={14} />Modo Rescate vigente</span>
                  : c.puedeRecibirRegalo ? <TextureButton variant="regalo" size="sm" className="w-auto" onClick={() => individual(c.id, c.nombres)}><IcBillete tam={16} />Activar Modo Rescate</TextureButton>
                  : <span className="text-xs text-gray-500">No aplica (sin mora o con plan en marcha)</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </MarcoGestor>
  );
}
