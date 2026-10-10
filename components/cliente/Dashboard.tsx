"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { APP_NOMBRE } from "@/lib/config";
import { api, soles, type Situacion } from "@/lib/cliente-api";
import Pacaso from "@/components/Pacaso";
import { TextureButton } from "@/components/ui/texture-button";
import { TextureCard, TextureCardContent, TextureSeparator } from "@/components/ui/texture-card";
import { RollingNumber } from "@/components/ui/rolling-number";
import { NeumorphEyebrow } from "@/components/ui/neumorph-eyebrow";
import Simulador, { type PlanElegido } from "./Simulador";
import Confirmar from "./Confirmar";
import Pagar from "./Pagar";
import Plan from "./Plan";
import Trivia from "./Trivia";
import Asistente from "./Asistente";
import RegaloSalvador from "./RegaloSalvador";

type Vista = "inicio" | "simulador" | "confirmar" | "plan" | "pagar" | "trivia" | "asistente";

const ETIQUETA: Record<Situacion["estado"], { texto: string; intent: "secondary" | "primary" | "alerta" | "default" }> = {
  al_dia: { texto: "✅ Al día", intent: "secondary" },
  en_mora: { texto: "⏰ Cuota pendiente", intent: "alerta" },
  plan_pendiente: { texto: "📝 Plan por arrancar", intent: "primary" },
  reprogramado: { texto: "🚀 Plan en marcha", intent: "secondary" },
  derivado: { texto: "🧑‍💼 Con tu gestor", intent: "primary" },
  incumplido: { texto: "⚠️ Beneficios en pausa", intent: "alerta" },
};

const nivelIntent = (n: string) => (n === "Oro" ? "oro" : n === "Plata" ? "plata" : "bronce") as "oro" | "plata" | "bronce";
const fmtSoles = (n: number) => soles(n);

export default function Dashboard({ clienteId }: { clienteId: number }) {
  const [sit, setSit] = useState<Situacion | null>(null);
  const [vista, setVista] = useState<Vista>("inicio");
  const [plan, setPlan] = useState<{ plan: PlanElegido; resultado: string; total: number } | null>(null);
  const [error, setError] = useState("");

  const refrescar = useCallback(async () => { const s = await api<Situacion>(`/api/cliente/${clienteId}`); setSit(s); return s; }, [clienteId]);
  useEffect(() => { api<Situacion>(`/api/cliente/${clienteId}?abrir=1`).then(setSit).catch((e) => setError(e.message)); }, [clienteId]);
  // Si el gestor otorga un regalo mientras el cliente mira la pantalla, aparece solo
  useEffect(() => { if (vista !== "inicio") return; const t = setInterval(() => { refrescar().catch(() => {}); }, 5000); return () => clearInterval(t); }, [vista, refrescar]);

  if (error) return <main className="p-6 max-w-md mx-auto"><p className="card text-red-700">{error}</p><Link href="/" className="underline text-caja">Volver al inicio</Link></main>;
  if (!sit) return <main className="p-6 max-w-md mx-auto text-center"><span className="text-5xl inline-block animate-bounce">🦫</span><p>Cargando…</p></main>;

  const volver = () => { setVista("inicio"); refrescar(); };
  const hayDeuda = sit.deuda.total > 0;
  const puedeArmar = !!sit.limites && hayDeuda && !sit.propuestaDerivada && !sit.propuestaActiva && !sit.regalo;
  const etiqueta = ETIQUETA[sit.estado];

  return (
    <main className="max-w-md md:max-w-xl mx-auto pb-16">
      <header className="bg-gradient-to-r from-caja-header to-caja-medio text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow">
        <span className="font-extrabold tracking-tight">🦫 {APP_NOMBRE}</span>
        <Link href="/" className="text-sm underline opacity-90 min-h-[44px] flex items-center">Salir</Link>
      </header>

      <div className="px-4 pt-4 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div key={vista} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }} className="space-y-4">
            {vista === "simulador" && puedeArmar && <Simulador sit={sit} onVolver={volver} onContinuar={(p, r, t) => { setPlan({ plan: p, resultado: r, total: t }); setVista("confirmar"); }} />}
            {vista === "confirmar" && plan && <Confirmar sit={sit} plan={plan.plan} resultado={plan.resultado} total={plan.total} onVolver={() => setVista("simulador")} onListo={(s) => { setSit(s); setVista("plan"); }} />}
            {vista === "plan" && <Plan sit={sit} onVolver={volver} onPagar={() => setVista("pagar")} />}
            {vista === "pagar" && <Pagar sit={sit} onPagado={setSit} onVolver={volver} />}
            {vista === "trivia" && <Trivia sit={sit} onScore={setSit} onVolver={volver} />}
            {vista === "asistente" && <Asistente sit={sit} onVolver={volver} />}

            {vista === "inicio" && (
              <>
                {sit.regalo && <RegaloSalvador regalo={sit.regalo} onPagar={() => setVista("pagar")} />}

                <TextureCard>
                  <TextureCardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <NeumorphEyebrow intent={etiqueta.intent}>{etiqueta.texto}</NeumorphEyebrow>
                      <NeumorphEyebrow intent={nivelIntent(sit.nivel)}>Nivel {sit.nivel}</NeumorphEyebrow>
                    </div>
                    <p className="text-lg leading-snug font-medium">{sit.saludo}</p>

                    {hayDeuda && (
                      <div className="rounded-2xl bg-gradient-to-br from-caja to-caja-header p-4 text-white shadow-inner">
                        <p className="text-sm text-white/80">Lo que debes hoy</p>
                        <p className="text-4xl font-extrabold tracking-tight"><RollingNumber value={sit.deuda.total} precision={2} format={fmtSoles} /></p>
                        <dl className="mt-2 text-sm grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-white/90">
                          <dt>Cuotas pendientes</dt><dd className="font-semibold">{soles(sit.deuda.montoVencido)}</dd>
                          <dt>Interés moratorio</dt><dd className="font-semibold">{soles(sit.deuda.interesMoratorio)}</dd>
                          <dt>Días de atraso</dt><dd className="font-semibold">{sit.diasAtraso}</dd>
                        </dl>
                        {sit.deuda.cuotas.map((c, i) => <p key={i} className="text-xs text-white/70 mt-1">Cuota de {soles(c.monto)} vencida el {c.vencioLargo}</p>)}
                      </div>
                    )}

                    <Pacaso humor={sit.pacaso.humor} mensaje={sit.pacaso.mensaje} grande fiesta={!!sit.regalo} />

                    <TextureSeparator />
                    <div>
                      <div className="flex justify-between items-baseline">
                        <span className="font-semibold">Tus puntos</span>
                        <span className="text-2xl font-extrabold text-caja"><RollingNumber value={sit.score} />/100</span>
                      </div>
                      <div className="h-3 rounded-full bg-caja-borde mt-1 overflow-hidden">
                        <motion.div className={`h-3 rounded-full ${sit.diasAtraso > 0 ? "bg-gradient-to-r from-amber-400 to-rose-500" : "bg-gradient-to-r from-caja-medio to-emerald-400"}`} initial={false} animate={{ width: `${sit.score}%` }} transition={{ type: "spring", damping: 20 }} />
                      </div>
                      <p className="text-sm mt-1 text-gray-700">{sit.siguienteNivel.texto}. {sit.beneficios}</p>
                    </div>
                  </TextureCardContent>
                </TextureCard>

                {sit.estado === "plan_pendiente" && (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm">⚡ Tu plan está aceptado pero <b>arranca con tu primer pago</b>. Mientras tanto el Pacaso sigue pegando, ¡dale!</div>
                )}
                {sit.propuestaActiva && <TextureButton variant="secondary" onClick={() => setVista("plan")}>📅 Ver mi plan de pago</TextureButton>}
                {sit.propuestaDerivada && <TextureButton variant="secondary" onClick={() => setVista("plan")}>📨 Ver mi propuesta enviada</TextureButton>}

                <h2 className="font-extrabold text-caja text-lg pt-1">¿Cómo le damos?</h2>
                <div className="grid gap-3">
                  {hayDeuda || sit.propuestaActiva ? <TextureButton variant="accent" size="lg" onClick={() => setVista("pagar")}>💳 {sit.estado === "plan_pendiente" ? "Hacer mi primer pago" : "Pagar hoy"}</TextureButton> : null}
                  {puedeArmar && <TextureButton size="lg" onClick={() => setVista("simulador")}>🧮 Armar mi plan de pago</TextureButton>}
                  <div className="grid grid-cols-2 gap-3">
                    <TextureButton variant="secondary" onClick={() => setVista("asistente")}>💬 Asistente</TextureButton>
                    <TextureButton variant="secondary" onClick={() => setVista("trivia")}>🎮 Trivia</TextureButton>
                  </div>
                </div>

                <details className="card text-sm">
                  <summary className="cursor-pointer font-semibold min-h-[44px] flex items-center">📈 Historial de mis puntos</summary>
                  <ul className="divide-y divide-caja-borde">
                    {sit.historialScore.map((m) => (
                      <li key={m.id} className="py-2 flex justify-between gap-2"><span>{m.detalle}</span><b className={m.puntos < 0 ? "text-red-700" : "text-green-700"}>{m.puntos > 0 ? "+" : ""}{m.puntos}</b></li>
                    ))}
                  </ul>
                </details>

                <details className="rounded-tarjeta border border-dashed border-gray-400 p-3 text-sm text-gray-600">
                  <summary className="cursor-pointer min-h-[44px] flex items-center">🛠️ Herramientas de la demo ({sit.fechaDemoLarga})</summary>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <TextureButton variant="oscuro" size="sm" onClick={async () => { await api("/api/demo/avanzar-dia", {}); refrescar(); }}>Pasar un día ⏭</TextureButton>
                    <TextureButton variant="secondary" size="sm" onClick={async () => { await api("/api/demo/reset", {}); refrescar(); }}>Reiniciar demo</TextureButton>
                  </div>
                </details>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
