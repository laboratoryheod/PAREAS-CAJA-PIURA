"use client";
import { useEffect, useState } from "react";
import { FichaApp, IcGestor, IcCalendario, IcCheck, IcCampana, IcLatigo, IcAtras } from "@/components/iconos";
import { TextureButton } from "@/components/ui/texture-button";
import { api, soles, type Situacion } from "@/lib/cliente-api";

/** Comprobante del plan aceptado (o de la propuesta enviada al gestor), con recordatorios y QR del próximo pago. */
export default function Plan({ sit, onPagar, onVolver }: { sit: Situacion; onPagar: () => void; onVolver: () => void }) {
  const p = sit.propuestaActiva ?? sit.propuestaDerivada;
  const [cobro, setCobro] = useState<any>(null);
  useEffect(() => { if (sit.propuestaActiva) api(`/api/pago-simulado?clienteId=${sit.cliente.id}`).then(setCobro).catch(() => {}); }, [sit]);
  if (!p) return <TextureButton onClick={onVolver}>Volver</TextureButton>;
  const derivada = p.estado === "derivada";
  const porArrancar = !derivada && !p.iniciado;
  const proximo = p.pagos.find((x: any) => !x.pagado);
  return (
    <section className="space-y-4">
      <button onClick={onVolver} className="-ml-2 flex min-h-[44px] items-center gap-0.5 text-[17px] text-[#0A84FF]"><IcAtras tam={22} />Volver</button>
      <div className="card space-y-3">
        <div className="flex justify-center"><FichaApp icono={derivada ? IcGestor : porArrancar ? IcCalendario : IcCheck} color={derivada ? "grafito" : porArrancar ? "sol" : "verde"} tam={56} /></div>
        <h2 className="text-xl font-bold text-caja text-center">{derivada ? "Propuesta enviada a tu gestor" : porArrancar ? "¡Plan aceptado! Falta tu primer pago" : "¡Tu plan está en marcha!"}</h2>
        {derivada && <p className="text-sm text-center">Un gestor la revisará y se comunicará contigo. Tranqui, no necesitas hacer nada más por ahora.</p>}
        {porArrancar && <p className="text-sm text-center rounded-xl bg-amber-50 border border-amber-200 p-2">Tu plan arranca cuando hagas tu primer pago. Hasta entonces Pareas sigue pegando, ¡no lo dejes para después!</p>}
        <ul className="divide-y divide-caja-borde text-sm">
          {p.pagos.map((x: any) => (
            <li key={x.n} className="flex justify-between py-2">
              <span className="flex items-center gap-1.5">{x.pagado && <IcCheck tam={16} className="text-[#34C759]" />}{x.tipo === "inicial" ? "Inicial · " : `Cuota ${x.n} · `}{x.fechaLarga}</span><b>{soles(x.monto)}</b>
            </li>
          ))}
        </ul>
        <p className="flex justify-between font-bold border-t border-caja-borde pt-2"><span>Total</span><span>{soles(p.total)}</span></p>
      </div>
      {!derivada && (
        <>
          <div className="card text-sm space-y-1">
            <h3 className="font-bold">Recordatorios</h3>
            <p className="flex items-start gap-2"><IcCampana tam={18} className="mt-0.5 text-[#FF9F0A]" />Te avisaremos 2 días antes y el mismo día de cada pago.</p>
            <p className="flex items-start gap-2"><IcLatigo tam={18} className="mt-0.5 text-[#FF3B30]" />Cumplir tu plan te suma puntos. Si se te pasa un pago, vuelve el CHICOTAZO y pierdes tus beneficios.</p>
          </div>
          {proximo && cobro?.qr && (
            <div className="card text-center space-y-2">
              <h3 className="font-bold">{porArrancar ? "Primer pago" : "Próximo pago"}: {soles(proximo.monto)}</h3>
              <img src={cobro.qr} alt="QR de pago" width={160} height={160} className="mx-auto rounded-xl border border-caja-borde" />
              <p className="text-xs text-gray-500">Compártelo con un familiar si prefiere pagar por ti.</p>
              <TextureButton variant="accent" size="lg" onClick={onPagar}>Pagar ahora</TextureButton>
            </div>
          )}
        </>
      )}
    </section>
  );
}
