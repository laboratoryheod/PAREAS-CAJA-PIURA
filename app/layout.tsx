import "./globals.css";
import type { Metadata } from "next";
import { APP_NOMBRE } from "@/lib/config";

export const metadata: Metadata = { title: APP_NOMBRE, description: "Autogestión dinámica de deuda" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
