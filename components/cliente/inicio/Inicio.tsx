"use client";
import type { Situacion } from "@/lib/cliente-api";
import { WidgetJuego, WidgetScore, WidgetPagos, WidgetConsejos, type ProgresoTrivia } from "./Widgets";
import { Calendario } from "./Calendario";
import { Beneficios } from "./Beneficios";
import { IslaPareas } from "./Isla";
import RegaloSalvador from "../RegaloSalvador";

type Destino = "pagar" | "finanzas" | "trivia" | "asistente";

/**
 * Página principal del cliente (según el boceto del equipo):
 *  [ Juego / trivia | Score ]
 *  [ Calendario           | Pagos y juegos ]
 *  [ Beneficios · campañas · CHICOTAZO | Consejos + agente ]
 */
export function Inicio({ sit, progreso, ir }: { sit: Situacion; progreso: ProgresoTrivia | null; ir: (v: Destino) => void }) {
  return (
    <div className="space-y-3 md:space-y-4">
      <IslaPareas humor={sit.pareas.humor} mensaje={sit.pareas.mensaje} />
      {sit.regalo && <RegaloSalvador regalo={sit.regalo} onPagar={() => ir("pagar")} />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <WidgetJuego className="col-span-2 md:col-span-1" progreso={progreso} onEmpezar={() => ir("trivia")} />
        <WidgetScore className="col-span-2" sit={sit} progreso={progreso} />
        <Calendario className="col-span-2" sit={sit} />
        <WidgetPagos className="col-span-2 md:col-span-1" sit={sit} progreso={progreso} ir={ir} />
        <Beneficios className="col-span-2" sit={sit} onPagar={() => ir("pagar")} />
        <WidgetConsejos className="col-span-2 md:col-span-1" sit={sit} onAgente={() => ir("asistente")} />
      </div>
    </div>
  );
}
