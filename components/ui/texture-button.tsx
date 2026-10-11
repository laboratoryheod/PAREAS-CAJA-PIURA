"use client";
// Adaptado de cult-ui (MIT) · texture-button: variantes con los colores de la Caja.
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const outer = cva("p-[1px] transition duration-300 ease-in-out disabled:opacity-40 disabled:pointer-events-none", {
  variants: {
    variant: {
      primary: "w-full border border-black/10 bg-gradient-to-b from-[#0072C6] to-[#00366F]",
      accent: "w-full border border-black/10 bg-gradient-to-b from-amber-200 to-[#E08E00]",
      secondary: "w-full border border-[#D6E4F5] bg-white/60",
      regalo: "w-full border border-black/10 bg-gradient-to-b from-[#5AA9F0] to-[#00347A]",
      oscuro: "w-full border border-black/10 bg-gradient-to-b from-black/70 to-black",
    },
    size: { sm: "rounded-[10px]", default: "rounded-[16px]", lg: "rounded-[18px]" },
  },
  defaultVariants: { variant: "primary", size: "default" },
});

const inner = cva("flex h-full w-full items-center justify-center gap-2 font-semibold transition duration-300 ease-in-out", {
  variants: {
    variant: {
      primary: "bg-gradient-to-b from-[#0B5FB5] to-[#0047AB] text-white hover:from-[#0072C6] hover:to-[#0B5FB5] active:from-[#00366F] active:to-[#00366F]",
      accent: "bg-gradient-to-b from-[#FFC24D] to-[#F9A825] text-[#1A1A1A] hover:from-[#FFD27A] hover:to-[#FFB733] active:from-[#E9971A] active:to-[#E9971A]",
      secondary: "bg-gradient-to-b from-white to-[#EEF4FB] text-[#0047AB] hover:to-[#E1ECF8] active:from-[#E1ECF8]",
      regalo: "bg-gradient-to-b from-[#0072C6] to-[#0047AB] text-white hover:from-[#1A84D6] hover:to-[#0A55BD] active:from-[#00529B] active:to-[#00529B]",
      oscuro: "bg-gradient-to-b from-neutral-700 to-neutral-900 text-white hover:from-neutral-600",
    },
    size: { sm: "min-h-[40px] rounded-[9px] px-4 py-1 text-sm", default: "min-h-[48px] rounded-[15px] px-5 py-2 text-base", lg: "min-h-[56px] rounded-[17px] px-6 py-3 text-lg" },
  },
  defaultVariants: { variant: "primary", size: "default" },
});

export interface TextureButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "secondary" | "regalo" | "oscuro";
  size?: "sm" | "default" | "lg";
  asChild?: boolean;
}

export const TextureButton = React.forwardRef<HTMLButtonElement, TextureButtonProps>(
  ({ children, variant = "primary", size = "default", asChild = false, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(outer({ variant, size }), className)} ref={ref} {...props}>
        <div className={inner({ variant, size })}>{children}</div>
      </Comp>
    );
  },
);
TextureButton.displayName = "TextureButton";
