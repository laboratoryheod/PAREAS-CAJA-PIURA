"use client";
// Gráfico circular de la cartera: porcentaje de morosos, impagos y clientes que pagaron.
// Los conteos y porcentajes vienen del servidor (/api/banco/distribucion); aquí solo se dibujan.
import { useState } from "react";
import { soles } from "@/lib/cliente-api";
import { IcGraficoCircular } from "@/components/iconos";
import { consulta, FILTROS_VACIOS, SelectoresFiltros, usarDatos, type Filtros, type OpcionesFiltros } from "./comun";

type Grupo = "morosos" | "impagos" | "pagaron";
interface Distribucion { total: number; grupos: { grupo: Grupo; clientes: number; pct: number; deuda: number }[]; filtros: OpcionesFiltros }

// Paleta validada (separación para daltonismo); la etiqueta con el porcentaje siempre acompaña al color
const GRUPOS: Record<Grupo, { nombre: string; color: string; nota: string }> = {
  pagaron: { nombre: "Pagaron", color: "#0072C6", nota: "Al día o pagando su plan" },
  morosos: { nombre: "Morosos", color: "#E89B00", nota: "En mora, plan sin primer pago o derivados" },
  impagos: { nombre: "Impagos", color: "#C9182B", nota: "Incumplieron su plan" },
};
const ORDEN: Grupo[] = ["pagaron", "morosos", "impagos"];

const R = 80, GROSOR = 30, C = 100;
function arco(desde: number, hasta: number) {
  // Ángulos en fracción de vuelta (0 = arriba, sentido horario)
  const p = (f: number, r: number) => [C + r * Math.sin(f * 2 * Math.PI), C - r * Math.cos(f * 2 * Math.PI)];
  const ri = R - GROSOR, grande = hasta - desde > 0.5 ? 1 : 0;
  const [x1, y1] = p(desde, R), [x2, y2] = p(hasta, R), [x3, y3] = p(hasta, ri), [x4, y4] = p(desde, ri);
  return `M${x1} ${y1}A${R} ${R} 0 ${grande} 1 ${x2} ${y2}L${x3} ${y3}A${ri} ${ri} 0 ${grande} 0 ${x4} ${y4}Z`;
}

export function GraficoCartera() {
  const [f, setF] = useState<Filtros>(FILTROS_VACIOS);
  const { datos } = usarDatos<Distribucion>(`/api/banco/distribucion?${consulta({ ...f })}`, 5000);
  const [foco, setFoco] = useState<Grupo | null>(null);
  const grupos = ORDEN.map((g) => datos?.grupos.find((x) => x.grupo === g) ?? { grupo: g, clientes: 0, pct: 0, deuda: 0 });
  const total = datos?.total ?? 0;
  const enFoco = foco ? grupos.find((g) => g.grupo === foco)! : null;

  let acum = 0;
  const porciones = grupos.filter((g) => g.clientes > 0).map((g) => {
    const desde = acum; acum += g.clientes / Math.max(1, total);
    return { ...g, desde, hasta: acum };
  });

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-caja"><IcGraficoCircular tam={18} />Situación de la cartera</h2>
        {Object.values(f).some(Boolean) && <button onClick={() => setF(FILTROS_VACIOS)} className="min-h-[36px] text-sm font-semibold text-caja-medio">Quitar filtros</button>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {datos && <SelectoresFiltros f={f} setF={setF} op={datos.filtros} />}
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <svg viewBox="0 0 200 200" className="h-52 w-52 shrink-0" role="img" aria-label={`Cartera: ${grupos.map((g) => `${GRUPOS[g.grupo].nombre} ${g.pct}%`).join(", ")}`}>
          {total === 0 && <circle cx={C} cy={C} r={R - GROSOR / 2} fill="none" stroke="#E5ECF5" strokeWidth={GROSOR} />}
          {porciones.map((p) => {
            const atenuar = foco && foco !== p.grupo;
            const comun = { fill: GRUPOS[p.grupo].color, stroke: "#fff", strokeWidth: 2, opacity: atenuar ? 0.35 : 1, className: "cursor-pointer transition-opacity",
              onMouseEnter: () => setFoco(p.grupo), onMouseLeave: () => setFoco(null), onClick: () => setFoco((x) => (x === p.grupo ? null : p.grupo)) };
            // Un solo grupo con el 100 %: anillo completo
            return p.hasta - p.desde >= 0.9999
              ? <path key={p.grupo} {...comun} fillRule="evenodd" d={`M${C} ${C - R}a${R} ${R} 0 1 1 0 ${2 * R}a${R} ${R} 0 1 1 0 ${-2 * R}ZM${C} ${C - R + GROSOR}a${R - GROSOR} ${R - GROSOR} 0 1 0 0 ${2 * (R - GROSOR)}a${R - GROSOR} ${R - GROSOR} 0 1 0 0 ${-2 * (R - GROSOR)}Z`}><title>{`${GRUPOS[p.grupo].nombre}: ${p.clientes} (${p.pct}%)`}</title></path>
              : <path key={p.grupo} {...comun} d={arco(p.desde, p.hasta)}><title>{`${GRUPOS[p.grupo].nombre}: ${p.clientes} (${p.pct}%)`}</title></path>;
          })}
          <text x={C} y={C - 4} textAnchor="middle" className="fill-[#1C1C1E] text-[26px] font-bold tabular-nums">{enFoco ? `${enFoco.pct}%` : total}</text>
          <text x={C} y={C + 18} textAnchor="middle" className="fill-neutral-500 text-[12px]">{enFoco ? GRUPOS[enFoco.grupo].nombre.toLowerCase() : "clientes"}</text>
        </svg>

        <ul className="w-full flex-1 space-y-2">
          {grupos.map((g) => (
            <li key={g.grupo}>
              <button onMouseEnter={() => setFoco(g.grupo)} onMouseLeave={() => setFoco(null)} onFocus={() => setFoco(g.grupo)} onBlur={() => setFoco(null)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${foco === g.grupo ? "border-caja-medio bg-[#EAF2FC]" : "border-caja-borde bg-white"}`}>
                <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: GRUPOS[g.grupo].color }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[#1C1C1E]">{GRUPOS[g.grupo].nombre}</span>
                  <span className="block text-xs text-neutral-500">{GRUPOS[g.grupo].nota}{g.deuda > 0 ? ` · deuda ${soles(g.deuda)}` : ""}</span>
                </span>
                <span className="text-right tabular-nums"><span className="block text-lg font-bold text-[#1C1C1E]">{g.pct}%</span><span className="block text-xs text-neutral-500">{g.clientes} clientes</span></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
