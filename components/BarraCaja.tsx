"use client";
// Barra superior con la distribución institucional de Caja Piura: logo y menú a la izquierda; a la derecha,
// el nombre de la página (PAREAS) y el usuario en píldoras, y las acciones. Línea naranja de la Caja debajo.
import Image from "next/image";
import { APP_NOMBRE } from "@/lib/config";
import { IcMenu, IcUsuario } from "@/components/iconos";
import { cn } from "@/lib/utils";

export function BarraCaja({ pagina = APP_NOMBRE, usuario, onMenu, menuAbierto, children, ancho = "max-w-7xl" }: {
  pagina?: string; usuario?: string; onMenu?: () => void; menuAbierto?: boolean; children?: React.ReactNode; ancho?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b-[3px] border-[#F39200] bg-caja-header text-white shadow-[0_2px_10px_rgba(0,40,90,0.18)]">
      <div className={cn("mx-auto flex h-[60px] items-center gap-2 px-3 sm:gap-3 sm:px-4", ancho)}>
        <Image src="/caja/logo-caja-piura-blanco.png" alt="Caja Piura" width={130} height={30} className="h-[22px] w-auto shrink-0 sm:h-[28px]" priority />
        {onMenu && (
          <button onClick={onMenu} aria-label="Menú" aria-expanded={menuAbierto} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white transition-colors hover:bg-white/10 sm:ml-4">
            <IcMenu tam={24} />
          </button>
        )}
        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-3">
          <span className="flex items-center gap-2">
            <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-[9px] bg-white"><Image src="/pareas/logo.png" alt="" fill sizes="32px" className="object-cover" /></span>
            <span className="rounded-lg bg-[#1E7FD6] px-3 py-1 text-[15px] font-extrabold uppercase tracking-[0.06em] shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)] max-[430px]:hidden">{pagina}</span>
          </span>
          {usuario && (
            <>
              <span className="hidden h-8 w-px bg-white/30 md:block" aria-hidden />
              <span className="hidden items-center gap-1.5 rounded-lg bg-[#1E7FD6] px-3 py-1 text-[15px] font-extrabold uppercase tracking-[0.04em] md:flex"><IcUsuario tam={16} />{usuario}</span>
            </>
          )}
          {children}
        </div>
      </div>
    </header>
  );
}
