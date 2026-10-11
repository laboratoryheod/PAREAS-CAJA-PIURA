"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { soles, type Situacion } from "@/lib/cliente-api";
import { REGLAS, REGALO_SALVADOR } from "@/lib/reglas";
import { HaloSegmented } from "@/components/ui/halo-segmented";
import { FichaApp, IcCandado, IcDescuento, IcMedalla, IcRegalo, IcCaja } from "@/components/iconos";
import { cn } from "@/lib/utils";
import { Widget, TituloWidget } from "./Widget";
import { TarjetaChicotazo } from "./Chicotazo";

const NIVELES = [
  { n: "Bronce", rango: "0–49", color: "from-[#FFB27A] to-[#D9682B]" },
  { n: "Plata", rango: "50–74", color: "from-[#C9D6EA] to-[#7F97BB]" },
  { n: "Oro", rango: "75–100", color: "from-[#FFE066] to-[#F2A100]" },
] as const;

function textoBeneficio(n: "Bronce" | "Plata" | "Oro") {
  const b = REGLAS.beneficiosNivel[n];
  const partes = [];
  if (b.cuotasExtra) partes.push(`+${b.cuotasExtra} cuota para reprogramar`);
  if (b.inicialMenosPct) partes.push(`${Math.round(b.inicialMenosPct * 100)}% menos de inicial`);
  return partes.length ? partes.join(" · ") : "Condiciones estándar";
}

export function Beneficios({ sit, className, onPagar }: { sit: Situacion; className?: string; onPagar: () => void }) {
  const [tab, setTab] = useState(sit.chicotazo.activo ? "chicotazo" : sit.regalo ? "campanas" : "beneficios");
  return (
    <Widget className={className}>
      <TituloWidget icono={<IcCaja tam={18} className="text-[#0072C6]" />}>Beneficios de la Caja</TituloWidget>
      <HaloSegmented className="mb-3 w-full [&>div:last-child]:w-full" value={tab} onValueChange={setTab}
        items={[{ value: "beneficios", label: "Beneficios" }, { value: "campanas", label: "Campañas" }, { value: "chicotazo", label: "CHICOTAZO" }]} />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 8, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -6, filter: "blur(4px)" }} transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
          {tab === "beneficios" && (
            <div className="space-y-2">
              {sit.sinBeneficios && (
                <div className="flex items-start gap-3 rounded-2xl bg-[#FFF1F0] p-3 text-[#B3122A]"><IcCandado tam={20} /><p className="text-[13px]">Tus beneficios están en pausa porque se pasó un pago de tu plan. Una campaña de la Caja te los devuelve.</p></div>
              )}
              {NIVELES.map((x) => {
                const actual = sit.nivel === x.n;
                return (
                  <div key={x.n} className={cn("flex items-center gap-3 rounded-2xl p-3 transition-colors", actual ? "bg-neutral-900 text-white" : "bg-neutral-50")}>
                    <span className={cn("grid h-10 w-10 place-items-center rounded-[11px] bg-gradient-to-b text-white", x.color)}><IcMedalla tam={22} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold">{x.n} <span className={cn("text-[12px] font-normal", actual ? "text-white/60" : "text-neutral-500")}>· {x.rango} pts</span></p>
                      <p className={cn("truncate text-[13px]", actual ? "text-white/75" : "text-neutral-500")}>{textoBeneficio(x.n)}</p>
                    </div>
                    {actual && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">{sit.sinBeneficios ? "En pausa" : "Tu nivel"}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {tab === "campanas" && (sit.regalo ? (
            <div className="rounded-[22px] bg-gradient-to-br from-[#D6247A] via-[#E2405F] to-[#FF7A59] p-4 text-white">
              <div className="flex items-center gap-3"><FichaApp icono={IcRegalo} color="rosa" tam={40} className="ring-2 ring-white/30" /><div><p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/80">Campaña activa</p><p className="text-[20px] font-bold leading-tight">Regalo Salvador</p></div></div>
              <div className="mt-3 flex items-end justify-between rounded-2xl bg-white/15 p-3">
                <div><p className="text-[12px] text-white/75">Te tocaba</p><p className="text-[16px] font-semibold line-through tabular-nums">{soles(sit.regalo.base)}</p></div>
                <IcDescuento tam={22} className="mb-1 text-white/80" />
                <div className="text-right"><p className="text-[12px] text-white/75">Pagas hoy</p><p className="text-[24px] font-bold leading-none tabular-nums">{soles(sit.regalo.montoHoy)}</p></div>
              </div>
              <p className="mt-2 text-[12px] text-white/85">Descuento de {sit.regalo.descuentoPct}% hoy · +{sit.regalo.recargoPct}% en tus próximas {sit.regalo.recargos.length} cuotas · vence el {sit.regalo.venceLargo}</p>
              <button onClick={onPagar} className="mt-3 min-h-[44px] w-full rounded-full bg-white text-[15px] font-semibold text-[#D6247A] active:scale-[0.96] transition-transform">Usar mi regalo</button>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl bg-neutral-50 p-4">
              <FichaApp icono={IcRegalo} color="grafito" tam={40} />
              <div><p className="text-[15px] font-semibold">Sin campañas por ahora</p><p className="text-[13px] text-neutral-500">Cuando la Caja te dé una mano (como el Regalo Salvador: {Math.round(REGALO_SALVADOR.descuentoPct * 100)}% menos hoy), aparecerá aquí.</p></div>
            </div>
          ))}

          {tab === "chicotazo" && <TarjetaChicotazo ch={sit.chicotazo} onPagar={sit.chicotazo.activo ? onPagar : undefined} />}
        </motion.div>
      </AnimatePresence>
    </Widget>
  );
}
