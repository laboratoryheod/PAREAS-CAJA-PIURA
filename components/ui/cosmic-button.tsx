// Adaptado de cult-ui (MIT) · cosmic-button: anillo con sol y azul de la Caja.
"use client"

import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

/**
 * Requires these keyframes and utilities in your CSS (e.g. global CSS or Tailwind):
 *
 * @keyframes cosmic-spin {
 *   from { transform: rotate(0deg); }
 *   to { transform: rotate(360deg); }
 * }
 * @keyframes cosmic-spin-slow {
 *   from { transform: rotate(0deg); }
 *   to { transform: rotate(-360deg); }
 * }
 * @utility animate-cosmic-spin {
 *   animation: cosmic-spin 3s linear infinite;
 * }
 * @utility animate-cosmic-spin-slow {
 *   animation: cosmic-spin-slow 5s linear infinite;
 * }
 */

export type CosmicButtonProps<E extends "a" | "button" = "a"> = {
  /** The HTML element to render as. @default "a" */
  as?: E
} & ComponentPropsWithoutRef<E>

/**
 * An animated button/link with a cosmic gradient border effect.
 * Renders as an anchor by default; use `as="button"` for button behavior.
 *
 * @example
 * // As link (default)
 * <CosmicButton href="/about">About</CosmicButton>
 *
 * @example
 * // As button
 * <CosmicButton as="button" onClick={handleClick}>Submit</CosmicButton>
 */
export function CosmicButton<E extends "a" | "button" = "a">({
  as,
  className,
  children,
  ...props
}: CosmicButtonProps<E>) {
  const Element = as ?? "a"
  const isAnchor = Element === "a"

  const baseClassName = cn(
    "group/cosmic relative inline-flex min-h-11 min-w-11 items-center justify-center gap-3 rounded-[15px] p-[3px] transition-transform",
    "focus-visible:ring-2 focus-visible:ring-[#F9A825] focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:focus-visible:ring-offset-[#0c0912]",
    className
  )

  const content = (
    <>
      {/* Animated cosmic border - enlarges on hover */}
      <span className="absolute inset-0 overflow-hidden rounded-[15px] transition-all duration-300 ease-out group-hover/cosmic:inset-[-3px] group-hover/cosmic:rounded-[15px]">
        <span className="animate-cosmic-spin absolute inset-[-200%] bg-[conic-gradient(from_0deg,#F9A825,#FFD27A,#FFF3D6,#0072C6,#0047AB,#F9A825)] opacity-95" />
      </span>

      {/* Noise/texture overlay on the border - enlarges on hover */}
      <span className="absolute inset-0 overflow-hidden rounded-[15px] opacity-45 mix-blend-soft-light transition-all duration-300 ease-out group-hover/cosmic:inset-[-3px] group-hover/cosmic:rounded-[15px] dark:opacity-60 dark:mix-blend-overlay">
        <span className="animate-cosmic-spin-slow absolute inset-[-200%] bg-[conic-gradient(from_180deg,#FFF3D6_0%,transparent_30%,#F9A825_50%,transparent_70%,#0072C6_100%)]" />
      </span>

      {/* Theme-aware inner background */}
      <span className="bg-gradient-to-b from-[#FFC24D] to-[#F9A825] relative z-10 flex items-center gap-3 rounded-[12px] px-5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),inset_0_-1px_0_rgba(15,23,42,0.08),0_1px_1px_rgba(15,23,42,0.08),0_8px_24px_rgba(15,23,42,0.14)] transition-all duration-300 group-hover/cosmic:shadow-[inset_0_1px_0_rgba(255,255,255,0.82),inset_0_-1px_0_rgba(15,23,42,0.12),0_2px_6px_rgba(15,23,42,0.14),0_12px_34px_rgba(15,23,42,0.2)] active:scale-[0.98] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.5),0_1px_1px_rgba(0,0,0,0.45),0_10px_28px_rgba(0,0,0,0.35)] dark:group-hover/cosmic:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-1px_0_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.55),0_14px_34px_rgba(0,0,0,0.42)]">
        <span className="text-caja-texto text-lg font-bold tracking-tight">
          {children ?? "Placeholder text"}
        </span>
      </span>
    </>
  )

  if (isAnchor) {
    const { href, rel, target, ...rest } =
      props as ComponentPropsWithoutRef<"a">
    return (
      <a
        className={baseClassName}
        href={href}
        rel={rel}
        target={target}
        {...rest}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      className={baseClassName}
      {...(props as ComponentPropsWithoutRef<"button">)}
    >
      {content}
    </button>
  )
}
