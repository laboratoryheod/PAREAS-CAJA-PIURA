"use client";
// Vista completa del chat con Pareas (misma conversación que la burbuja flotante).
import { FichaApp, IcBurbuja, IcAtras } from "@/components/iconos";
import { PanelChat, type Conversacion } from "./ChatPareas";

export default function Asistente({ chat, onVolver, onPagar }: { chat: Conversacion; onVolver: () => void; onPagar: () => void }) {
  return (
    <section className="space-y-3">
      <button onClick={onVolver} className="-ml-2 flex min-h-[44px] items-center gap-0.5 text-[17px] text-[#0072C6]"><IcAtras tam={22} />Volver</button>
      <div className="card overflow-hidden p-0">
        <div className="px-4 pt-4">
          <h2 className="flex items-center gap-2 text-[22px] font-bold tracking-[-0.02em]"><FichaApp icono={IcBurbuja} color="cielo" tam={34} />Hablar con Pareas</h2>
          <p className="text-xs text-gray-500">Pagos, campañas, puntos, Mis Finanzas y temas de la Caja.</p>
        </div>
        <PanelChat chat={chat} alto="h-[min(560px,68dvh)]" onPagar={onPagar} />
      </div>
    </section>
  );
}
