"use client";
import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import type { HumorPareas } from "@/components/Pareas";
import { IcLatigo, IcChispa, IcOjo } from "@/components/iconos";
import { cn } from "@/lib/utils";

/** Notificación de Pareas estilo Dynamic Island: compacta y se expande al tocarla. */
export function IslaPareas({ humor, mensaje }: { humor: HumorPareas; mensaje: string }) {
  const [abierta, setAbierta] = useState(false);
  const Icono = humor === "chicotazo" ? IcLatigo : humor === "feliz" ? IcChispa : IcOjo;
  const acento = humor === "chicotazo" ? "text-[#FF453A]" : humor === "feliz" ? "text-[#FFD60A]" : "text-[#5AC8FA]";
  return (
    <motion.button layout onClick={() => setAbierta((x) => !x)} aria-expanded={abierta}
      className="mx-auto flex w-full max-w-md items-center gap-3 overflow-hidden bg-black px-3 py-2.5 text-left text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
      style={{ borderRadius: 26 }} transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}>
      <motion.span layout className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white">
        <Image src="/pareas/logo.png" alt="" fill sizes="36px" className="object-cover" />
      </motion.span>
      <motion.span layout className="min-w-0 flex-1">
        <span className={cn("flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em]", acento)}><Icono tam={13} />{humor === "chicotazo" ? "Chicotazo" : "Pareas"}</span>
        <span className={cn("block text-[14px] leading-snug", abierta ? "" : "truncate")}>{mensaje}</span>
      </motion.span>
    </motion.button>
  );
}
