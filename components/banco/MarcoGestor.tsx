"use client";
// Marco común del panel del gestor: barra con la marca de Caja Piura + sidebar de secciones.
import Link from "next/link";
import { usePathname } from "next/navigation";
import BotonReinicio from "@/components/BotonReinicio";
import { IcBillete, IcGraficoCircular, IcLista } from "@/components/iconos";
import { cn } from "@/lib/utils";
import { APP_NOMBRE } from "@/lib/config";
import { BarraCaja } from "@/components/BarraCaja";
import { useState } from "react";

const SECCIONES = [
  { href: "/banco", texto: "Resumen", icono: IcGraficoCircular },
  { href: "/banco/cartera", texto: "Cartera", icono: IcLista },
  { href: "/banco/rescate", texto: "Modo Rescate", icono: IcBillete },
];

export function MarcoGestor({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(true); // el botón de menú muestra u oculta las secciones
  const ruta = usePathname();
  const activa = (href: string) => (href === "/banco" ? ruta === "/banco" : ruta.startsWith(href) || (href === "/banco/cartera" && ruta.startsWith("/banco/cliente")));
  return (
    <>
      <BarraCaja pagina={APP_NOMBRE} usuario="Gestor" onMenu={() => setMenu((x) => !x)} menuAbierto={menu}>
        <BotonReinicio claro destino="/banco" />
        <button className="min-h-[44px] text-sm underline" onClick={async () => { await fetch("/api/banco/login", { method: "DELETE" }); window.location.assign("/banco/login"); }}>Salir</button>
      </BarraCaja>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-16 pt-4 md:flex-row">
        <nav aria-label="Secciones del panel" className={cn("md:sticky md:top-[80px] md:h-fit md:w-56 md:shrink-0", !menu && "hidden")}>
          <ul className="grid grid-cols-3 gap-1 rounded-2xl border border-caja-borde bg-white p-1.5 md:flex md:flex-col md:p-2">
            {SECCIONES.map(({ href, texto, icono: Icono }) => (
              <li key={href}>
                <Link href={href} aria-current={activa(href) ? "page" : undefined}
                  className={cn("flex min-h-[44px] items-center justify-center gap-2.5 rounded-xl px-2 text-[14px] font-semibold transition-colors md:justify-start md:px-3 md:text-[15px]",
                    activa(href) ? "bg-caja text-white" : "text-caja hover:bg-[#EAF2FC]")}>
                  <Icono tam={19} className="max-sm:hidden" />{texto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 flex-1 space-y-5">{children}</main>
      </div>
    </>
  );
}
