import localFont from "next/font/local";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { APP_NOMBRE } from "@/lib/config";

// Fuente servida por la propia app (next/font): se precarga, no depende de servidores externos y trae un
// respaldo ajustado al mismo tamaño, así que el texto no "salta" al cargar (CLS = 0).
const plusJakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-plus-jakarta",
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = { title: `${APP_NOMBRE} · Caja Piura`, description: "PAREAS: autogestión de deuda y finanzas con Pareas, la iguana de la Caja Piura" };
export const viewport: Viewport = { themeColor: "#00529B", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={plusJakarta.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
