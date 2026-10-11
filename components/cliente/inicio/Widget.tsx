import { cn } from "@/lib/utils";

/** Superficie de widget estilo iOS: esquinas 28px, fondo vidrio, sombras en capas. */
export function Widget({ className, children, oscuro = false, ...p }: React.HTMLAttributes<HTMLElement> & { oscuro?: boolean }) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] p-4",
        oscuro
          ? "bg-[#111317] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.25)]"
          : "bg-white shadow-[0_0_0_1px_#D6E4F5,0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,71,171,0.06)]",
        className,
      )}
      {...p}
    >
      {children}
    </section>
  );
}

export function TituloWidget({ icono, children, accion }: { icono?: React.ReactNode; children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {icono}
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{children}</h2>
      </div>
      {accion}
    </div>
  );
}
