// ICONOS PROPIOS de Ponte al Día con Pareas — glifos dibujados para el proyecto (estilo SF Symbols:
// trazo redondeado 1.8 en una grilla de 24). Sin emojis ni librerías de iconos genéricas.
import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type P = SVGProps<SVGSVGElement> & { tam?: number };

function Glifo({ tam = 22, className, children, ...p }: P & { children: React.ReactNode }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("shrink-0", className)} {...p}>
      {children}
    </svg>
  );
}

export const IcInicio = (p: P) => <Glifo {...p}><path d="M3.5 10.6 12 4l8.5 6.6" /><path d="M5.5 9.3V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.3" /><path d="M10 20.5v-4.2a2 2 0 0 1 4 0v4.2" /></Glifo>;
export const IcTarjeta = (p: P) => <Glifo {...p}><rect x="2.8" y="5.5" width="18.4" height="13" rx="3" /><path d="M2.8 10h18.4" /><path d="M6.5 15h3.5" /><circle cx="17" cy="15" r="1" fill="currentColor" stroke="none" /></Glifo>;
export const IcCalendario = (p: P) => <Glifo {...p}><rect x="3.2" y="5" width="17.6" height="15.5" rx="3.2" /><path d="M3.2 9.8h17.6M8 3.2v3.4M16 3.2v3.4" /><circle cx="8.2" cy="14" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" /><rect x="14.8" y="13" width="3" height="3" rx="0.8" fill="currentColor" stroke="none" /></Glifo>;
export const IcMando = (p: P) => <Glifo {...p}><path d="M7.2 7.5h9.6a4.6 4.6 0 0 1 4.5 5.4l-.6 3.4a2.4 2.4 0 0 1-4.1 1.2L14.4 15.5H9.6l-2.2 2a2.4 2.4 0 0 1-4.1-1.2l-.6-3.4a4.6 4.6 0 0 1 4.5-5.4Z" /><path d="M8 10.4v2.8M6.6 11.8h2.8" /><circle cx="15.6" cy="10.8" r=".9" fill="currentColor" stroke="none" /><circle cx="17.4" cy="12.8" r=".9" fill="currentColor" stroke="none" /></Glifo>;
export const IcBurbuja = (p: P) => <Glifo {...p}><path d="M20.5 11.5c0 4.2-3.8 7.5-8.5 7.5-1.2 0-2.4-.2-3.4-.6L4 20l1.2-3.6C4.1 15 3.5 13.3 3.5 11.5 3.5 7.3 7.3 4 12 4s8.5 3.3 8.5 7.5Z" /><circle cx="8.6" cy="11.6" r=".95" fill="currentColor" stroke="none" /><circle cx="12" cy="11.6" r=".95" fill="currentColor" stroke="none" /><circle cx="15.4" cy="11.6" r=".95" fill="currentColor" stroke="none" /></Glifo>;
/** El látigo del CHICOTAZO: mango, tralla que se curva y el chasquido. */
export const IcLatigo = (p: P) => <Glifo {...p}><path d="M3.5 20.5 7.6 16.4" strokeWidth={2.6} /><path d="M7.6 16.4c2.6-2.6 2-6.2 5.2-8.4 2.4-1.6 5.2-1 6.2 1 .9 1.8-.4 3.6-2.2 3.4" /><path d="M19.5 3.2v2M21.6 5.6h-2M20.9 3.9l-1.3 1.3" /></Glifo>;
export const IcRegalo = (p: P) => <Glifo {...p}><rect x="3.5" y="8.5" width="17" height="4" rx="1.4" /><path d="M5 12.5v6.2A1.8 1.8 0 0 0 6.8 20.5h10.4a1.8 1.8 0 0 0 1.8-1.8v-6.2M12 8.5v12" /><path d="M12 8.5C10.6 5.4 7.4 4.6 7 6.6c-.4 1.9 2.6 1.9 5 1.9ZM12 8.5c1.4-3.1 4.6-3.9 5-1.9.4 1.9-2.6 1.9-5 1.9Z" /></Glifo>;
export const IcEscudo = (p: P) => <Glifo {...p}><path d="M12 3.2 19 6v5.4c0 4.4-3 7.9-7 9.4-4-1.5-7-5-7-9.4V6Z" /><path d="m8.8 12.2 2.2 2.2 4.4-4.6" /></Glifo>;
export const IcBolsa = (p: P) => <Glifo {...p}><path d="M9 4.2h6l-1.6 3.2h-2.8Z" /><path d="M10.6 7.4C6.4 9 4 12.6 4 15.6 4 18.6 6.6 20.6 12 20.6s8-2 8-5c0-3-2.4-6.6-6.6-8.2" /><path d="M13.6 11.6c-.4-.6-1-.9-1.7-.9-1 0-1.8.6-1.8 1.4 0 1.9 3.8 1 3.8 3 0 .8-.9 1.4-2 1.4-.8 0-1.5-.3-1.9-.9M12 9.9v.8M12 16.5v.8" /></Glifo>;
export const IcBombilla = (p: P) => <Glifo {...p}><path d="M9 17.2h6M9.8 20.5h4.4" /><path d="M12 3.5a6 6 0 0 0-3.6 10.8c.6.5.9 1.2.9 2v.9h5.4v-.9c0-.8.3-1.5.9-2A6 6 0 0 0 12 3.5Z" /><path d="M12 7.5a2.5 2.5 0 0 0-2.5 2.5" /></Glifo>;
export const IcGestor = (p: P) => <Glifo {...p}><path d="M4.5 13.5v-1.8a7.5 7.5 0 0 1 15 0v1.8" /><rect x="3.5" y="13" width="3.6" height="5.4" rx="1.6" /><rect x="16.9" y="13" width="3.6" height="5.4" rx="1.6" /><path d="M18.7 18.4c0 1.4-1.6 2.3-4.2 2.3h-1.4" /></Glifo>;
export const IcQR = (p: P) => <Glifo {...p}><rect x="3.5" y="3.5" width="6.4" height="6.4" rx="1.6" /><rect x="14.1" y="3.5" width="6.4" height="6.4" rx="1.6" /><rect x="3.5" y="14.1" width="6.4" height="6.4" rx="1.6" /><path d="M14.1 14.1h2.6v2.6M20.5 14.1v.1M14.1 20.5h.1M17.3 20.5h3.2v-3.2" /></Glifo>;
export const IcCalculadora = (p: P) => <Glifo {...p}><rect x="5" y="3" width="14" height="18" rx="3" /><rect x="7.8" y="5.8" width="8.4" height="3.6" rx="1" /><circle cx="9" cy="13" r=".9" fill="currentColor" stroke="none" /><circle cx="12" cy="13" r=".9" fill="currentColor" stroke="none" /><circle cx="15" cy="13" r=".9" fill="currentColor" stroke="none" /><circle cx="9" cy="16.8" r=".9" fill="currentColor" stroke="none" /><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none" /><path d="M15 15.9v1.8" /></Glifo>;
export const IcLlama = (p: P) => <Glifo {...p}><path d="M12 20.8c-3.6 0-6.2-2.5-6.2-5.8 0-3.4 2.6-5 3.4-8.8 2 1 3.2 2.8 3.4 4.6.8-.6 1.4-1.6 1.6-2.8 2.2 1.8 4 4.2 4 7 0 3.3-2.6 5.8-6.2 5.8Z" /><path d="M12 20.8c-1.5 0-2.6-1-2.6-2.4 0-1.6 1.4-2.4 2.2-3.8 1.6 1 3 2.2 3 3.8 0 1.4-1.1 2.4-2.6 2.4Z" /></Glifo>;
export const IcMedalla = (p: P) => <Glifo {...p}><path d="m8.2 3.5 2.4 5.2M15.8 3.5l-2.4 5.2" /><circle cx="12" cy="14.6" r="5.8" /><path d="m12 11.6.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3Z" /></Glifo>;
export const IcCheck = (p: P) => <Glifo {...p}><circle cx="12" cy="12" r="8.5" /><path d="m8.3 12.3 2.5 2.5 4.9-5.2" /></Glifo>;
export const IcAlerta = (p: P) => <Glifo {...p}><path d="M10.4 4.6 3.3 17.3A1.8 1.8 0 0 0 4.9 20h14.2a1.8 1.8 0 0 0 1.6-2.7L13.6 4.6a1.8 1.8 0 0 0-3.2 0Z" /><path d="M12 9.5v4" /><circle cx="12" cy="16.6" r=".95" fill="currentColor" stroke="none" /></Glifo>;
export const IcFlecha = (p: P) => <Glifo {...p}><path d="M5 12h13.5M13.5 6.5 19 12l-5.5 5.5" /></Glifo>;
export const IcAtras = (p: P) => <Glifo {...p}><path d="M14.5 5.5 8 12l6.5 6.5" /></Glifo>;
export const IcCerrar = (p: P) => <Glifo {...p}><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></Glifo>;
export const IcMas = (p: P) => <Glifo {...p}><path d="M12 5.5v13M5.5 12h13" /></Glifo>;
export const IcCampana = (p: P) => <Glifo {...p}><path d="M6.2 16.2V11a5.8 5.8 0 0 1 11.6 0v5.2l1.6 1.8H4.6Z" /><path d="M10 20.4a2.2 2.2 0 0 0 4 0" /></Glifo>;
export const IcCandado = (p: P) => <Glifo {...p}><rect x="4.8" y="10.4" width="14.4" height="10.1" rx="2.6" /><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6" /><path d="M12 14.4v2.2" /></Glifo>;
export const IcEnVivo = (p: P) => <Glifo {...p}><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /><path d="M8.1 15.9a5.5 5.5 0 0 1 0-7.8M15.9 8.1a5.5 5.5 0 0 1 0 7.8M5.3 18.7a9.5 9.5 0 0 1 0-13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4" /></Glifo>;
export const IcCaja = (p: P) => <Glifo {...p}><path d="M3.5 9.2 12 4l8.5 5.2" /><path d="M5.5 9.8v8.2M9.8 9.8v8.2M14.2 9.8v8.2M18.5 9.8v8.2M3.5 20.5h17" /></Glifo>;
export const IcChispa = (p: P) => <Glifo {...p}><path d="M12 3.5c.6 4 2.2 6.6 6.5 7.8-4.3 1.2-5.9 3.8-6.5 7.8-.6-4-2.2-6.6-6.5-7.8 4.3-1.2 5.9-3.8 6.5-7.8Z" /><path d="M19 3.5v3M20.5 5h-3" /></Glifo>;
export const IcReloj = (p: P) => <Glifo {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Glifo>;
export const IcOjo = (p: P) => <Glifo {...p}><path d="M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12Z" /><circle cx="12" cy="12" r="2.8" /></Glifo>;
export const IcCompartir = (p: P) => <Glifo {...p}><path d="M12 3.8v11M8 7.6l4-3.8 4 3.8" /><path d="M7.5 11H6.3a1.8 1.8 0 0 0-1.8 1.8v5.9a1.8 1.8 0 0 0 1.8 1.8h11.4a1.8 1.8 0 0 0 1.8-1.8v-5.9a1.8 1.8 0 0 0-1.8-1.8h-1.2" /></Glifo>;
export const IcReiniciar = (p: P) => <Glifo {...p}><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4.2 4.2v3.4h3.4" /></Glifo>;
/** Salvavidas: el Modo Rescate. */
export const IcSalvavidas = (p: P) => <Glifo {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.6" /><path d="M9.4 9.4 6 6M14.6 9.4 18 6M14.6 14.6 18 18M9.4 14.6 6 18" strokeWidth={2.6} /></Glifo>;
export const IcDescuento = (p: P) => <Glifo {...p}><path d="M3.8 12.6V5.4a1.6 1.6 0 0 1 1.6-1.6h7.2l7.8 7.8a1.6 1.6 0 0 1 0 2.3l-6.6 6.6a1.6 1.6 0 0 1-2.3 0Z" /><circle cx="8.3" cy="8.3" r="1.3" /><path d="m11 15.2 4.2-4.2" /></Glifo>;

/** Pareas en silueta (cabeza de iguana con cresta) para avatares pequeños. */
export const IcPareas = (p: P) => <Glifo {...p}><path d="M4 16.5c0-4.6 3.4-8.3 8.2-8.3 3.4 0 6.4 1.6 7.6 4.1.5 1-.1 2.2-1.2 2.4l-4 .6" /><path d="M5.8 10.8 4.6 8.6M8 8.9l-.5-2.6M10.6 8.3l.2-2.6" /><circle cx="14.2" cy="11.2" r="1.1" fill="currentColor" stroke="none" /><path d="M4 16.5c1.4 1.8 3.6 3 6.4 3 2.2 0 3.8-.6 4.6-1.6" /></Glifo>;

// ---------------------------------------------------------------- ficha de app (estilo iOS)

const PALETA = {
  azul: "from-[#2F8CFF] to-[#0047AB]",
  cielo: "from-[#5AC8FA] to-[#0072C6]",
  sol: "from-[#FFD60A] to-[#FF9F0A]",
  coral: "from-[#FF7A59] to-[#FF375F]",
  rojo: "from-[#FF6A3D] to-[#C9182B]",
  verde: "from-[#5EE08A] to-[#1DA851]",
  violeta: "from-[#C77DFF] to-[#7B2FF7]",
  rosa: "from-[#FF6FB5] to-[#D6247A]",
  grafito: "from-[#5A5F6A] to-[#1C1F26]",
  menta: "from-[#63E6E2] to-[#0FA5A0]",
} as const;
export type ColorFicha = keyof typeof PALETA;

/** Icono tipo app de iOS: squircle con degradado, brillo superior y glifo blanco. */
export function FichaApp({ icono: Icono, color = "azul", tam = 44, className }: { icono: (p: P) => React.ReactElement; color?: ColorFicha; tam?: number; className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-b text-white shadow-[0_1px_1px_rgba(0,0,0,0.12),0_4px_10px_rgba(0,0,0,0.12)]", PALETA[color], className)}
      style={{ width: tam, height: tam, borderRadius: tam * 0.2237 }}>
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent" />
      <Icono tam={tam * 0.56} strokeWidth={2} className="relative" />
    </span>
  );
}
