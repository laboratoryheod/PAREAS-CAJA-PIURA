"use client";
import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { soles, type Situacion } from "@/lib/cliente-api";
import { FichaApp, IcBombilla, IcBurbuja, IcCalculadora, IcCalendario, IcFlecha, IcLlama, IcMando, IcQR, IcTarjeta, IcSalvavidas, IcAtras } from "@/components/iconos";
import { cn } from "@/lib/utils";
import { Widget, TituloWidget } from "./Widget";
import { AnilloScore } from "./AnilloScore";

export interface ProgresoTrivia { respondidas: number; total: number; aciertos: number; completo: boolean; puntosTriviaHoy: number; topeDia: number }

// ---------------------------------------------------------------- juego / trivia
export function WidgetJuego({ progreso, onEmpezar, className }: { progreso: ProgresoTrivia | null; onEmpezar: () => void; className?: string }) {
  const p = progreso ?? { respondidas: 0, total: 5, aciertos: 0, completo: false, puntosTriviaHoy: 0, topeDia: 10 };
  const texto = p.completo ? "Completado" : p.respondidas > 0 ? "Seguir jugando" : "Empezar";
  return (
    <Widget className={cn("flex flex-col justify-between bg-gradient-to-br from-[#5B2EE5] to-[#9B4DFF] text-white", className)}>
      <div className="flex items-start justify-between">
        <FichaApp icono={IcMando} color="violeta" tam={42} className="ring-1 ring-white/25" />
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums">+{p.puntosTriviaHoy}/{p.topeDia} pts</span>
      </div>
      <div className="mt-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/70">Juego del día</p>
        <p className="text-[20px] font-bold leading-tight tracking-[-0.02em]">Trivia de Pareas</p>
        <div className="mt-2 flex gap-1.5" aria-label={`${p.respondidas} de ${p.total} preguntas`}>
          {Array.from({ length: p.total }, (_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < p.respondidas ? "bg-white" : "bg-white/25")} />)}
        </div>
      </div>
      <button onClick={onEmpezar} disabled={p.completo} className="mt-3 flex min-h-[44px] items-center justify-center gap-1 rounded-full bg-white text-[15px] font-semibold text-[#5B2EE5] transition-transform active:scale-[0.96] disabled:opacity-60">
        {texto}{!p.completo && <IcFlecha tam={16} />}
      </button>
    </Widget>
  );
}

// ---------------------------------------------------------------- score
export function WidgetScore({ sit, progreso, className }: { sit: Situacion; progreso: ProgresoTrivia | null; className?: string }) {
  const mora = sit.diasAtraso > 0;
  return (
    <Widget className={cn("flex items-center gap-4", className)}>
      <AnilloScore score={sit.score} nivel={sit.nivel} trivia={progreso?.puntosTriviaHoy ?? 0} topeTrivia={progreso?.topeDia ?? 10} mora={mora} />
      <div className="min-w-0 space-y-1.5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-neutral-500">Score</p>
        <p className="text-[20px] font-bold leading-tight tracking-[-0.02em]">Nivel {sit.nivel}</p>
        <p className="text-[13px] text-neutral-600">{sit.siguienteNivel.texto}</p>
        <div className="flex flex-wrap gap-1.5 pt-0.5 text-[11px] font-semibold">
          <span className="flex items-center gap-1 rounded-full bg-[#E8F8EE] px-2 py-0.5 text-[#1DA851]"><span className="h-1.5 w-1.5 rounded-full bg-[#1DA851]" />Trivia hoy</span>
          <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5", mora ? "bg-[#FFF1F0] text-[#C9182B]" : "bg-[#EEF4FF] text-[#0072C6]")}>
            <IcLlama tam={12} />{mora ? "Racha en pausa" : "Racha activa"}
          </span>
        </div>
      </div>
      <div className="ml-auto hidden min-w-0 max-w-[280px] flex-1 lg:block">
        <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-neutral-500">Últimos movimientos</p>
        <ul className="divide-y divide-black/5 rounded-2xl bg-neutral-50">
          {sit.historialScore.slice(0, 3).map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]">
              <span className="truncate">{x.detalle}</span>
              <span className={cn("font-semibold tabular-nums", x.puntos < 0 ? "text-[#C9182B]" : "text-[#1DA851]")}>{x.puntos > 0 ? "+" : ""}{x.puntos}</span>
            </li>
          ))}
          {sit.historialScore.length === 0 && <li className="px-3 py-2 text-[13px] text-neutral-500">Aún sin movimientos</li>}
        </ul>
      </div>
    </Widget>
  );
}

// ---------------------------------------------------------------- pagos y juegos
function Fila({ icono, color, titulo, sub, onClick, valor }: { icono: Parameters<typeof FichaApp>[0]["icono"]; color: Parameters<typeof FichaApp>[0]["color"]; titulo: string; sub?: string; onClick: () => void; valor?: string }) {
  return (
    <li>
      <button onClick={onClick} className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-black/[0.03] active:bg-black/[0.06]">
        <FichaApp icono={icono} color={color} tam={32} />
        <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-medium">{titulo}</p>{sub && <p className="truncate text-[12px] text-neutral-500">{sub}</p>}</div>
        {valor && <span className="text-[14px] font-semibold tabular-nums">{valor}</span>}
        <IcFlecha tam={14} className="text-neutral-300" />
      </button>
    </li>
  );
}

export function WidgetPagos({ sit, progreso, ir, className }: { sit: Situacion; progreso: ProgresoTrivia | null; ir: (v: "pagar" | "simulador" | "plan" | "trivia") => void; className?: string }) {
  const proximo = sit.propuestaActiva?.pagos.find((x) => !x.pagado);
  const monto = sit.regalo ? sit.regalo.montoHoy : proximo ? proximo.monto : sit.deuda.total;
  const hayPago = monto > 0;
  return (
    <Widget className={cn("flex flex-col p-0", className)}>
      <div className="p-4 pb-2">
        <TituloWidget>Pagos y juegos</TituloWidget>
        <p className="-mt-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-neutral-500">{sit.regalo ? "Con su Modo Rescate" : proximo ? `Próximo pago · ${proximo.fechaLarga}` : hayPago ? "Su deuda de hoy" : "Está al día"}</p>
        <p className={cn("text-[34px] font-bold leading-tight tracking-[-0.03em] tabular-nums", sit.diasAtraso > 0 && !sit.regalo ? "text-[#C9182B]" : "text-neutral-900")}>{soles(monto)}</p>
        {sit.diasAtraso > 0 && <p className="text-[13px] text-neutral-500">{sit.diasAtraso} días de atraso · incluye {soles(sit.deuda.interesMoratorio)} de mora</p>}
      </div>
      <ul className="mx-3 mb-3 divide-y divide-black/5 overflow-hidden rounded-2xl bg-neutral-50">
        {hayPago && <Fila icono={sit.regalo ? IcSalvavidas : IcTarjeta} color={sit.regalo ? "rosa" : "azul"} titulo={sit.estado === "plan_pendiente" ? "Hacer mi primer pago" : "Pagar hoy"} sub="Pago con código QR" onClick={() => ir("pagar")} />}
        {sit.limites && !sit.propuestaActiva && !sit.propuestaDerivada && !sit.regalo && <Fila icono={IcCalculadora} color="sol" titulo="Armar mi plan" sub={`Hasta ${sit.limites.maxCuotas} cuotas`} onClick={() => ir("simulador")} />}
        {(sit.propuestaActiva || sit.propuestaDerivada) && <Fila icono={IcCalendario} color="cielo" titulo="Ver mi plan" sub={sit.propuestaDerivada ? "En revisión del gestor" : sit.estado === "plan_pendiente" ? "Falta el primer pago" : "En marcha"} onClick={() => ir("plan")} />}
        {hayPago && <Fila icono={IcQR} color="grafito" titulo="QR para un familiar" sub="Para que un familiar pague por usted" onClick={() => ir("pagar")} />}
        <Fila icono={IcMando} color="violeta" titulo="Trivia del día" sub={progreso?.completo ? "Completada" : `${progreso?.respondidas ?? 0}/${progreso?.total ?? 5} respondidas`} onClick={() => ir("trivia")} />
      </ul>
    </Widget>
  );
}

// ---------------------------------------------------------------- consejos + agente
const CONSEJOS = [
  { t: "Separe primero su cuota", d: "Al cobrar sus ventas, reserve el monto de su cuota antes de cualquier otro gasto." },
  { t: "Separe las cuentas del negocio", d: "No mezcle el dinero del negocio con el del hogar: así sabrá cuánto gana realmente." },
  { t: "Programe recordatorios", d: "Configure una alarma dos días antes de cada fecha de pago." },
  { t: "Forme un fondo de emergencia", d: "Ahorre un monto pequeño cada semana para cubrir los meses de menores ventas." },
  { t: "Anticípese al atraso", d: "Si prevé que no llegará a pagar, arme su plan antes: pagará menos mora y conservará sus beneficios." },
  { t: "Evite pagar deudas con deudas", d: "Solicitar un préstamo para pagar otro suele aumentar el endeudamiento." },
  { t: "Registre sus ingresos y gastos", d: "Un registro sencillo le muestra en qué se destina su dinero." },
];

export function WidgetConsejos({ sit, onAgente, className }: { sit: Situacion; onAgente: () => void; className?: string }) {
  const base = Number(sit.fechaHoy.replace(/-/g, "")) % CONSEJOS.length;
  const [i, setI] = useState(base);
  const c = CONSEJOS[i % CONSEJOS.length];
  return (
    <Widget className={cn("flex flex-col", className)}>
      <TituloWidget icono={<IcBombilla tam={18} className="text-[#FF9F0A]" />}
        accion={<div className="flex">
          <button onClick={() => setI((x) => (x + CONSEJOS.length - 1) % CONSEJOS.length)} aria-label="Consejo anterior" className="grid h-9 w-9 place-items-center rounded-full text-neutral-400 hover:bg-black/5 active:scale-[0.96]"><IcAtras tam={16} /></button>
          <button onClick={() => setI((x) => (x + 1) % CONSEJOS.length)} aria-label="Consejo siguiente" className="grid h-9 w-9 place-items-center rounded-full text-neutral-400 hover:bg-black/5 active:scale-[0.96]"><IcFlecha tam={16} /></button>
        </div>}>
        Consejo del día
      </TituloWidget>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={i} className="flex-1" initial={{ opacity: 0, y: 8, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -6, filter: "blur(4px)" }} transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
          <p className="text-[18px] font-bold leading-snug tracking-[-0.02em]">{c.t}</p>
          <p className="mt-1 text-[14px] leading-relaxed text-neutral-600">{c.d}</p>
        </motion.div>
      </AnimatePresence>
      <button onClick={onAgente} className="mt-4 flex min-h-[52px] items-center gap-3 rounded-2xl bg-neutral-900 px-3 text-left text-white transition-transform active:scale-[0.98]">
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[10px] bg-white"><Image src="/pareas/logo.png" alt="" fill sizes="36px" className="object-cover" /></span>
        <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Hablar con Pareas</span><span className="block truncate text-[12px] text-white/60">Su asistente: deuda, plan y pagos</span></span>
        <IcBurbuja tam={20} className="text-[#5AC8FA]" />
      </button>
    </Widget>
  );
}
