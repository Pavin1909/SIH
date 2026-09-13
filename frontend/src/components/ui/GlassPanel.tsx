import { ReactNode } from "react";

export interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  glow?: "none" | "cyan" | "blue" | "purple";
}

export function GlassPanel({
  children,
  className = "",
  elevated = false,
  glow = "none",
}: GlassPanelProps) {
  const glowStyles = {
    none: "",
    cyan: "shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(6,182,212,0.15)] border-cyan-500/25",
    blue: "shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(2,132,199,0.15)] border-sky-500/25",
    purple: "shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(147,51,234,0.15)] border-purple-500/25",
  };

  return (
    <div
      className={`rounded-2xl border backdrop-blur-xl transition-all duration-200 ${
        elevated
          ? "bg-[#0d162a]/75 border-white/[0.12] shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
          : "bg-[#0a1223]/60 border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      } ${glowStyles[glow]} ${className}`}
    >
      {children}
    </div>
  );
}
