"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Situacion } from "@/lib/cliente-api";
import { soles } from "@/lib/cliente-api";
import { IcAtras, IcFlecha, IcCalendario } from "@/components/iconos";
import { cn } from "@/lib/utils";
import { Widget, TituloWidget } from "./Widget";

type Tipo = "vencida" | "plan" | "pagado" | "regalo" | "recargo";
interface Marca { fecha: string; tipo: Tipo; texto: string; monto?: number }

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const COLOR: Record<Tipo, string> = { vencida: "bg-[#FF3B30]", plan: "bg-[#0072C6]", pagado: "bg-[#34C759]", regalo: "bg-[#D6247A]", recargo: "bg-[#FF9F0A]" };
const ETIQUETA: Record<Tipo, string> = { vencida: "Vencida", plan: "Pago del plan", pagado: "Pagado", regalo: "Vence su regalo", recargo: "Recargo" };

/** Todas las fechas vienen del servidor (situación del cliente); aquí solo se ubican en el mes. */
function marcasDe(s: Situacion): Marca[] {
  const m: Marca[] = s.deuda.cuotas.map((c) => ({ fecha: c.vencio, tipo: "vencida", texto: "Cuota vencida", monto: c.monto }));
  const plan = s.propuestaActiva ?? s.propuestaDerivada;
  plan?.pagos.forEach((p) => m.push({ fecha: p.fecha, tipo: p.pagado ? "pagado" : "plan", texto: p.tipo === "inicial" ? "Inicial del plan" : `Cuota ${p.n} del plan`, monto: p.monto }));
  if (s.regalo) {
    m.push({ fecha: s.regalo.vence, tipo: "regalo", texto: "Vence su Modo Rescate", monto: s.regalo.montoHoy });
    s.regalo.recargos.forEach((r) => m.push({ fecha: r.fecha, tipo: "recargo", texto: "Recargo del regalo", monto: r.monto }));
  }
  return m;
}

export function Calendario({ sit, className }: { sit: Situacion; className?: string }) {
  const [y0, m0] = sit.fechaHoy.split("-").map(Number);
  const [mes, setMes] = useState({ y: y0, m: m0 - 1 });
  const marcas = useMemo(() => marcasDe(sit), [sit]);
  const porDia = useMemo(() => {
    const map = new Map<string, Marca[]>();
    for (const x of marcas) map.set(x.fecha, [...(map.get(x.fecha) ?? []), x]);
    return map;
  }, [marcas]);
  const [elegido, setElegido] = useState<string | null>(null);
  // Días en mora (desde la cuota vencida más antigua hasta hoy): cada uno fue un CHICOTAZO
  const inicioMora = sit.diasAtraso > 0 ? [...sit.deuda.cuotas.map((c) => c.vencio)].sort()[0] : null;

  const primero = new Date(Date.UTC(mes.y, mes.m, 1));
  const offset = (primero.getUTCDay() + 6) % 7; // lunes primero
  const dias = new Date(Date.UTC(mes.y, mes.m + 1, 0)).getUTCDate();
  const iso = (d: number) => `${mes.y}-${String(mes.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const mover = (k: number) => { setElegido(null); setMes(({ y, m }) => { const t = m + k; return { y: y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 }; }); };

  const proximos = marcas.filter((x) => x.fecha >= sit.fechaHoy && x.tipo !== "pagado").sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 3);
  const vencidas = marcas.filter((x) => x.tipo === "vencida");
  const lista = elegido ? porDia.get(elegido) ?? [] : [...vencidas, ...proximos].slice(0, 4);
  const fechaCorta = (f: string) => { const [, mm, dd] = f.split("-").map(Number); return `${dd} ${MESES[mm - 1].slice(0, 3).toLowerCase()}`; };

  return (
    <Widget className={cn("bg-gradient-to-b from-[#EAF2FC] to-[#F5F9FE]", className)}>
      <TituloWidget icono={<IcCalendario tam={18} className="text-[#FF3B30]" />}
        accion={<div className="flex items-center gap-1">
          <button onClick={() => mover(-1)} aria-label="Mes anterior" className="grid h-9 w-9 place-items-center rounded-full text-[#0072C6] active:scale-[0.96] hover:bg-black/5"><IcAtras tam={18} /></button>
          <button onClick={() => mover(1)} aria-label="Mes siguiente" className="grid h-9 w-9 place-items-center rounded-full text-[#0072C6] active:scale-[0.96] hover:bg-black/5"><IcFlecha tam={18} /></button>
        </div>}>
        Mi calendario de pagos
      </TituloWidget>
      <p className="-mt-2 mb-2 text-[22px] font-bold tracking-[-0.02em]"><span className="text-[#FF3B30]">{MESES[mes.m]}</span> {mes.y}</p>

      <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase text-[#0072C6]/70">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} className="py-1">{d}</span>)}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={`${mes.y}-${mes.m}`} className="grid grid-cols-7 gap-y-1 text-center"
          initial={{ opacity: 0, x: 12, filter: "blur(4px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} exit={{ opacity: 0, x: -12, filter: "blur(4px)" }} transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
          {Array.from({ length: offset }, (_, i) => <span key={`v${i}`} />)}
          {Array.from({ length: dias }, (_, i) => {
            const d = i + 1, f = iso(d), ms = porDia.get(f) ?? [], hoy = f === sit.fechaHoy, sel = f === elegido;
            const enMora = !!inicioMora && f > inicioMora && f <= sit.fechaHoy;
            return (
              <button key={f} onClick={() => setElegido(sel ? null : f)} aria-label={`${d} de ${MESES[mes.m]}${ms.length ? `: ${ms.map((x) => ETIQUETA[x.tipo]).join(", ")}` : ""}`}
                className={cn("relative mx-auto flex h-11 w-full flex-col items-center justify-center active:scale-[0.96]", enMora && "bg-[#FF3B30]/[0.08]")}>
                <span className={cn("grid h-8 w-8 place-items-center rounded-full text-[15px] tabular-nums transition-colors",
                  hoy ? "bg-[#FF3B30] font-semibold text-white" : sel ? "bg-neutral-900 text-white"   : ms.some((x) => x.tipo === "vencida") ? "font-semibold text-[#FF3B30]" : "text-[#0B2E5C]")}>{d}</span>
                <span className="absolute bottom-0.5 flex gap-0.5">{ms.slice(0, 3).map((x, k) => <span key={k} className={cn("h-1.5 w-1.5 rounded-full", COLOR[x.tipo])} />)}</span>
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500">
        {(["vencida", "plan", "pagado", "regalo", "recargo"] as Tipo[]).map((t) => <span key={t} className="flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", COLOR[t])} />{ETIQUETA[t]}</span>)}
        {inicioMora && <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-[#FF3B30]/20" />Día con CHICOTAZO</span>}
      </div>

      <ul className="mt-3 divide-y divide-[#D6E4F5] rounded-2xl bg-white/80">
        {lista.length === 0 && <li className="px-3 py-3 text-sm text-neutral-500">{elegido ? "Nada para este día." : "No tiene fechas pendientes."}</li>}
        {lista.map((x, i) => (
          <li key={i} className="flex items-center gap-3 px-3 py-2.5">
            <span className={cn("h-8 w-1 rounded-full", COLOR[x.tipo])} />
            <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium">{x.texto}</p><p className="text-[12px] text-neutral-500">{fechaCorta(x.fecha)}{x.tipo === "vencida" ? " · ya venció" : ""}</p></div>
            {x.monto !== undefined && <span className="text-[14px] font-semibold tabular-nums">{soles(x.monto)}</span>}
          </li>
        ))}
      </ul>
    </Widget>
  );
}
