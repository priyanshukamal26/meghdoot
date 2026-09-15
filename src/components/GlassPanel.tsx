"use client";

import { type ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  glow?: "cyan" | "green" | "yellow" | "orange" | "red" | "none";
  hover?: boolean;
  as?: "div" | "section" | "article";
}

/**
 * Glass-morphic container with backdrop blur, gradient border, and optional
 * colored glow accent. The grain texture is applied via CSS pseudo-element
 * defined in index.css.
 */
export function GlassPanel({
  children,
  className,
  glow = "none",
  hover = false,
  as: Tag = "div",
}: GlassPanelProps) {
  const glowColors: Record<string, string> = {
    cyan: "shadow-brand-accent/10 border-brand-accent/25",
    green: "shadow-brand-green/10 border-brand-green/25",
    yellow: "shadow-brand-yellow/10 border-brand-yellow/25",
    orange: "shadow-brand-orange/10 border-brand-orange/25",
    red: "shadow-brand-red/10 border-brand-red/25",
    none: "border-brand-border",
  };

  return (
    <Tag
      className={cn(
        // Base glass panel
        "relative rounded-2xl overflow-hidden",
        "bg-gradient-to-b from-white/[0.06] to-white/[0.02]",
        "backdrop-blur-xl",
        "border",
        "shadow-xl",
        // Grain overlay
        "glass-grain",
        // Glow variant
        glowColors[glow],
        // Hover
        hover &&
          "transition-all duration-300 hover:shadow-2xl hover:border-brand-accent/40 hover:scale-[1.01]",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export { cn };
