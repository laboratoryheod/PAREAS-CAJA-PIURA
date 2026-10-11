"use client";
import { motion } from "motion/react";
import { soles, type Situacion } from "@/lib/cliente-api";
import { TextureButton } from "@/components/ui/texture-button";
import { IcChispa, IcSalvavidas } from "@/components/iconos";

/** Tarjeta de la campaña "Modo Rescate" que el gestor activó para este cliente. */
export default function RegaloSalvador({ regalo, onPagar }: { regalo: NonNullable<Situacion["regalo"]>; onPagar: () => void }) {
  return (
    <motion.section initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 14 }}
      className="relative overflow-hidden rounded-[24px] p-[2px] bg-gradient-to-br from-fuchsia-400 via-rose-400 to-amber-300 shadow-lg">
      <div className="relative rounded-[22px] bg-gradient-to-br from-fuchsia-700 via-rose-600 to-orange-500 p-4 text-white">
        {/* destellos de fondo */}
        {["left-4 top-3", "right-6 top-8", "left-1/2 bottom-3", "right-3 bottom-10"].map((pos, i) => (
          <motion.span key={pos} className={`absolute ${pos} text-[#FFD60A]`} animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.45 }}><IcChispa tam={16} /></motion.span>
        ))}
        <div className="relative flex items-center gap-3">
          <motion.span className="text-white" animate={{ rotate: [0, -10, 10, -6, 0], y: [0, -4, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1 }}><IcSalvavidas tam={44} /></motion.span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Campaña de la Caja</p>
            <h2 className="text-2xl font-extrabold leading-tight">La Caja activó su Modo Rescate</h2>
          </div>
        </div>
        <p className="relative mt-3 text-sm text-white/90">Paga hoy un <b>{regalo.descuentoPct}% menos</b> y póngase al día de inmediato. El descuento se recupera con un {regalo.recargoPct}% más en sus próximas 3 cuotas.</p>
        <div className="relative mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-white/15 p-2"><p className="text-xs text-white/80">Monto original</p><p className="text-lg font-bold line-through decoration-2">{soles(regalo.base)}</p></div>
          <div className="rounded-2xl bg-white p-2 text-rose-700"><p className="text-xs">Paga hoy</p><p className="text-2xl font-extrabold">{soles(regalo.montoHoy)}</p></div>
        </div>
        <ul className="relative mt-3 space-y-1 text-xs text-white/90">
          {regalo.recargos.map((r) => <li key={r.n} className="flex justify-between"><span>Recargo en su cuota del {r.fechaLarga}</span><b>+ {soles(r.monto)}</b></li>)}
        </ul>
        <p className="relative mt-2 text-xs text-white/80">Válido hasta el {regalo.venceLargo}. Al usarlo recupera sus beneficios.</p>
        <TextureButton variant="accent" size="lg" className="relative mt-3" onClick={onPagar}>Usar mi Modo Rescate</TextureButton>
      </div>
    </motion.section>
  );
}
