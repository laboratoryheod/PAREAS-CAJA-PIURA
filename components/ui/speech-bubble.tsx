// Adaptado de cult-ui (MIT) · speech-bubble: globo de diálogo de Pareas.
import { cn } from "@/lib/utils";

export function SpeechBubble({ children, className, tono = "info" }: { children: React.ReactNode; className?: string; tono?: "info" | "alerta" | "fiesta" }) {
  const color = tono === "alerta" ? "bg-[#7A2E0E] text-amber-50" : tono === "fiesta" ? "bg-gradient-to-br from-fuchsia-600 to-rose-500 text-white" : "bg-[#00529B] text-white";
  const fill = tono === "alerta" ? "#7A2E0E" : tono === "fiesta" ? "#C026D3" : "#00529B";
  return (
    <div data-slot="speech-bubble" className={cn("ml-3", className)}>
      <div className={cn("relative w-fit rounded-[22px] px-4 py-3 shadow-md", color)}>
        <svg aria-hidden="true" className="absolute -left-[13px] bottom-0 h-5 rotate-[5deg] -scale-x-100" fill="none" viewBox="0 0 53 45" width="26" height="22">
          <path fill={fill} d="M44 0H0V0C0 24.8528 20.1472 45 45 45H53V45C47.1396 36.535 44 26.4842 44 16.1886V0Z" />
        </svg>
        <p className="relative text-[15px] font-medium leading-snug tracking-[-0.01em]">{children}</p>
      </div>
    </div>
  );
}
