// Adaptado de cult-ui (MIT) · neumorph-eyebrow: intents de nivel y alerta.
import type React from "react";
import { cva, type VariantProps } from "class-variance-authority";

const variantes = cva(
  "flex h-7 w-fit items-center gap-1 rounded-full border-[.75px] px-3 text-xs font-semibold shadow-[inset_0px_-2.1px_0px_0px_rgb(244,241,238),_0px_1.2px_6.3px_0px_rgb(244,241,238)]",
  {
    variants: {
      intent: {
        default: "border-[#E9E3DD] bg-[#FBFAF9] text-[#36322F]",
        primary: "border-blue-200 bg-blue-50 text-blue-800",
        secondary: "border-green-200 bg-green-50 text-green-800",
        oro: "border-amber-300 bg-gradient-to-b from-amber-100 to-amber-200 text-amber-900",
        plata: "border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 text-slate-700",
        bronce: "border-orange-300 bg-gradient-to-b from-orange-100 to-orange-200 text-orange-900",
        alerta: "border-rose-200 bg-rose-50 text-rose-800",
      },
    },
    defaultVariants: { intent: "default" },
  },
);

export function NeumorphEyebrow({ children, intent, className }: VariantProps<typeof variantes> & { children: React.ReactNode; className?: string }) {
  return <div className={variantes({ intent, className })}>{children}</div>;
}
