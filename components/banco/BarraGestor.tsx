import Image from "next/image";
import { APP_NOMBRE } from "@/lib/config";

/** Barra superior del panel del gestor con la marca de Caja Piura. */
export function BarraGestor({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 bg-caja-header text-white shadow-[0_1px_0_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-h-[44px] items-center gap-3">
          <Image src="/caja/logo-caja-piura-blanco.png" alt="Caja Piura" width={120} height={28} className="h-[26px] w-auto" priority />
          <span className="h-6 w-px bg-white/25" aria-hidden />
          <span className="text-[15px] font-semibold">{APP_NOMBRE} · Panel del gestor</span>
        </div>
        <div className="flex items-center gap-3">{children}</div>
      </div>
    </header>
  );
}
