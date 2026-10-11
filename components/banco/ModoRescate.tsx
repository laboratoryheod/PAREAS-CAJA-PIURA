"use client";
// Campañas de Modo Rescate: masivas desde un score mínimo (el gestor elige cuál) o individuales buscando al cliente por DNI o nombre.
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

interface Previa { min: number; elegibles: number; conRescate: number; deuda: number; atajos: { min: number; elegibles: number }[] }

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function ModoRescate() {
  const [minimo, setMinimo] = useState(60);
  const [texto, setTexto] = useState("60");
  const minDebounced = usarDebounce(minimo, 250);
  const { datos, recargar } = usarDatos<Previa>(`/api/banco/rescate?min=${minDebounced}`, 10000);
  const previa = datos && datos.min === minDebounced ? datos : null;
  const [aviso, setAviso] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [q, setQ] = useState("");
  const qDebounced = usarDebounce(q.trim(), 300);
  const busqueda = usarDatos<{ filas: any[] }>(qDebounced.length >= 2 ? `/api/banco/cartera?${consulta({ q: qDebounced })}` : "", 20000);

  const avisar = (t: string) => { setAviso(t); setTimeout(() => setAviso(""), 6000); };

  const elegir = (n: number) => { const v = Math.max(0, Math.min(100, Math.round(n))); setMinimo(v); setTexto(String(v)); setConfirmar(false); };

  async function masivo() {
    if (!confirmar) { setConfirmar(true); setTimeout(() => setConfirmar(false), 4000); return; }
    setConfirmar(false); setEnviando(true);
    try {
      const res = await api<{ otorgados: number; omitidos: number }>("/api/banco/rescate", { min: minimo });
      avisar(`Modo Rescate activado a ${res.otorgados} cliente(s) con ${minimo} puntos o más.${res.omitidos ? ` ${res.omitidos} no aplicaban.` : ""}`);
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

      <section className="card space-y-4">
        <div>
          <h2 className="font-bold text-caja">Campaña masiva por puntos</h2>
          <p className="text-sm text-gray-600">Elija el score mínimo: se activa a todos los clientes elegibles con ese puntaje <b>o más</b>.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Score mínimo rápido">
          {(previa?.atajos ?? datos?.atajos ?? []).map((a) => (
            <button key={a.min} onClick={() => elegir(a.min)} aria-pressed={minimo === a.min}
              className={`min-h-[44px] rounded-full border px-4 text-[15px] font-semibold tabular-nums transition-colors ${minimo === a.min ? "border-caja bg-caja text-white" : "border-caja-borde bg-white text-caja hover:bg-[#EAF2FC]"}`}>
              {a.min} pts o más <span className={minimo === a.min ? "text-white/80" : "text-gray-500"}>· {a.elegibles}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-caja-borde bg-[#F5F9FE] p-4 md:flex-row md:items-center">
          <label className="flex items-center gap-3 text-sm font-semibold text-caja">
            Score mínimo
            <input type="number" inputMode="numeric" min={0} max={100} value={texto} aria-label="Score mínimo personalizado"
              onChange={(e) => { setTexto(e.target.value); const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) { setMinimo(Math.max(0, Math.min(100, Math.round(n)))); setConfirmar(false); } }}
              onBlur={() => setTexto(String(minimo))}
              className="h-12 w-24 rounded-xl border border-caja-borde bg-white px-3 text-center text-lg font-bold tabular-nums text-[#1C1C1E]" />
          </label>
          <input type="range" min={0} max={100} value={minimo} onChange={(e) => elegir(Number(e.target.value))} aria-label="Deslizar score mínimo" className="h-11 flex-1 accent-[#0047AB]" />
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm" aria-live="polite">
            {previa ? (
              <>
                <p><b className="text-lg tabular-nums text-caja">{previa.elegibles}</b> cliente(s) elegibles con <b>{previa.min} puntos o más</b></p>
                <p className="text-xs text-gray-500">{previa.elegibles ? `Deuda vencida ${soles(previa.deuda)}` : "Nadie para activar con este mínimo"}{previa.conRescate ? ` · ${previa.conRescate} ya tienen Modo Rescate vigente` : ""}</p>
              </>
            ) : <p className="text-gray-500">Calculando…</p>}
          </div>
          <TextureButton variant="regalo" className="md:w-auto" disabled={!previa?.elegibles || enviando} onClick={masivo}>
            <IcBillete tam={18} />{!previa?.elegibles ? "Sin clientes elegibles" : confirmar ? `Confirmar: activar a ${previa.elegibles}` : `Activar a ${previa.elegibles} cliente(s)`}
          </TextureButton>
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
