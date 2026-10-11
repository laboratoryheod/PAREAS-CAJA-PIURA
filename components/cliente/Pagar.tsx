"use client";
import { useEffect, useState } from "react";
import { IcCheck, IcCompartir, IcAtras } from "@/components/iconos";
import { TextureButton } from "@/components/ui/texture-button";
import { api, soles, type Situacion } from "@/lib/cliente-api";

export default function Pagar({ sit, onPagado, onVolver }: { sit: Situacion; onPagado: (s: Situacion) => void; onVolver: () => void }) {
  const [cobro, setCobro] = useState<any>(null);
  const [recibo, setRecibo] = useState<any>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => { api(`/api/pago-simulado?clienteId=${sit.cliente.id}`).then(setCobro).catch((e) => setError(e.message)); }, [sit.cliente.id]);

  async function pagar() {
    setCargando(true); setError("");
    try { const r = await api("/api/pago-simulado", { clienteId: sit.cliente.id, concepto: cobro.concepto }); setRecibo(r); onPagado(r.situacion); }
    catch (e: any) { setError(e.message); }
    setCargando(false);
  }

  async function compartir() {
    const texto = `Pago de ${cobro.montoTexto} para ${cobro.pagadorSugerido} · Código ${cobro.codigo} (simulado)`;
    try { if (navigator.share) await navigator.share({ title: "Pago por un familiar", text: texto }); else { await navigator.clipboard.writeText(texto); setCopiado(true); } } catch { /* cancelado */ }
  }

  if (recibo) {
    const c = recibo.comprobante;
    return (
      <section className="space-y-4">
        <div className="card text-center space-y-2">
          <IcCheck tam={56} className="mx-auto text-[#34C759]" />
          <h2 className="text-xl font-extrabold text-caja">¡Pago hecho!</h2>
          <p className="text-3xl font-bold">{c.montoTexto}</p>
          <p className="text-sm text-gray-600">{c.detalle} · {c.fechaLarga}</p>
          <p className="text-xs text-gray-500">Comprobante {c.codigo} · pago simulado de prototipo</p>
          {recibo.mensajes.map((m: string) => <p key={m} className="rounded-xl bg-green-50 border border-green-200 p-2 text-sm">{m}</p>)}
        </div>
        <TextureButton onClick={onVolver}>Volver a mi situación</TextureButton>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <button onClick={onVolver} className="-ml-2 flex min-h-[44px] items-center gap-0.5 text-[17px] text-[#0072C6]"><IcAtras tam={22} />Volver</button>
      <div className="card space-y-3 text-center">
        <h2 className="text-xl font-extrabold text-caja">{cobro?.concepto === "regalo" ? "Pago con Regalo Salvador" : "Pagar hoy"}</h2>
        {!cobro && !error && <p>Cargando…</p>}
        {cobro?.concepto === "nada" && <p>No tiene pagos pendientes. Está al día.</p>}
        {cobro && cobro.concepto !== "nada" && (
          <>
            <p className="text-sm text-gray-600">{cobro.detalle}</p>
            <p className="text-4xl font-bold">{cobro.montoTexto}</p>
            {cobro.qr && <img src={cobro.qr} alt="Código QR de pago" width={200} height={200} className="mx-auto rounded-xl border border-caja-borde" />}
            <p className="text-xs text-gray-500">Este código QR también puede usarlo un familiar para pagar por usted.</p>
            <TextureButton variant={cobro.concepto === "regalo" ? "regalo" : "accent"} size="lg" onClick={pagar} disabled={cargando}>{cargando ? "Procesando…" : "Hacer el pago (simulado)"}</TextureButton>
            <TextureButton variant="secondary" onClick={compartir}><IcCompartir tam={18} />{copiado ? "¡Copiado!" : "Compartir con un familiar"}</TextureButton>
          </>
        )}
        {error && <p className="text-red-700 text-sm">{error}</p>}
      </div>
    </section>
  );
}
