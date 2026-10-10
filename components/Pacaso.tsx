// Mascota. Hoy es un emoji; para reemplazarla por la ilustración basta con cambiar el contenido de este componente.
export type HumorPacaso = "feliz" | "serio" | "chicotazo";

export default function Pacaso({ humor, mensaje, grande = false }: { humor: HumorPacaso; mensaje?: string; grande?: boolean }) {
  const clase = humor === "chicotazo" ? "pacaso-chicotazo" : humor === "feliz" ? "pacaso-feliz" : "";
  return (
    <div className="flex items-start gap-3">
      <div className={`relative shrink-0 ${grande ? "text-7xl" : "text-5xl"} leading-none`} aria-label={`Pacaso ${humor}`}>
        <span className={`inline-block ${clase}`}>🦫</span>
        {humor === "chicotazo" && <span className="absolute -top-1 -right-3 text-2xl">💥</span>}
        {humor === "feliz" && <span className="absolute -top-1 -right-3 text-xl">✨</span>}
      </div>
      {mensaje && (
        <p className={`rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-snug ${humor === "chicotazo" ? "bg-amber-50 border border-amber-200" : "bg-caja-borde/40 border border-caja-borde"}`}>
          {mensaje.replace(/^🦫\s*/, "")}
        </p>
      )}
    </div>
  );
}
