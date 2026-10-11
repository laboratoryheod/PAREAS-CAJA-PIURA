// Pantalla de carga con Pareas. Es solo HTML + CSS (sin JavaScript): aparece al instante mientras el servidor
// prepara la página y las animaciones corren aunque el navegador aún no haya descargado el resto de la app.
export const FRASES_CARGA = ["Preparando tus mejores planes", "Afilando el coletazo", "Optimizando mejoras", "Buscando las mejores promociones"];

export function PantallaCarga({ compacta = false }: { compacta?: boolean }) {
  return (
    <div role="status" aria-live="polite" aria-label="Cargando" className={compacta ? "grid place-items-center py-16" : "grid min-h-[100dvh] place-items-center px-6"}>
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pareas/pareas-carga.webp" alt="" width={compacta ? 88 : 132} height={compacta ? 86 : 128} fetchPriority="high" decoding="async" className="carga-pareas drop-shadow-[0_16px_20px_rgba(0,30,80,0.22)]" />
          <span className="carga-sombra mx-auto mt-1 block h-2.5 w-20 rounded-[50%] bg-[#00347A]/15" aria-hidden />
        </div>
        <div className="relative mt-5 h-7 w-[19rem] overflow-hidden text-[17px] font-semibold text-[#00529B]">
          {FRASES_CARGA.map((f, i) => (
            <span key={f} className="carga-frase absolute inset-0" style={{ animationDelay: `${i * 1.6}s` }}>{f}…</span>
          ))}
        </div>
        <div className="mt-3 h-1.5 w-44 overflow-hidden rounded-full bg-[#00529B]/15" aria-hidden>
          <span className="carga-barra block h-full w-1/3 rounded-full bg-gradient-to-r from-[#0072C6] to-[#F9A825]" />
        </div>
        <span className="sr-only">{FRASES_CARGA[0]}…</span>
      </div>
    </div>
  );
}
