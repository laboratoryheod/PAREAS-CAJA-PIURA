// Adaptado de cult-ui (MIT) · texture-card (variante TextureCardStyled, sin variables de shadcn).
import * as React from "react";
import { cn } from "@/lib/utils";

export const TextureCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-[24px] border border-white/60 bg-gradient-to-b from-[#EAF2FC] to-white/80", className)} {...props}>
    <div className="rounded-[23px] border border-black/10">
      <div className="rounded-[22px] border border-white/50">
        <div className="rounded-[21px] border border-[#0047AB]/15">
          <div className="w-full rounded-[20px] border border-white/50 bg-gradient-to-b from-white to-white/70 text-[#1A1A1A]">{children}</div>
        </div>
      </div>
    </div>
  </div>
));
TextureCard.displayName = "TextureCard";

export const TextureCardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("p-4", className)} {...props} />;
export const TextureSeparator = ({ className }: { className?: string }) => (
  <div className={cn("border border-l-transparent border-r-transparent border-t-[#D6E4F5] border-b-white", className)} />
);
