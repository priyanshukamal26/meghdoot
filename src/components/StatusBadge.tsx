"use client";

import { cn } from "./GlassPanel";

type StatusVariant = "success" | "warning" | "error" | "pending";

interface StatusBadgeProps {
  variant?: StatusVariant;
  label: string;
  className?: string;
  mono?: boolean;
}

const variantStyles: Record<StatusVariant, { dot: string; text: string; bg: string }> = {
  success: {
    dot: "bg-brand-green",
    text: "text-brand-green",
    bg: "bg-brand-green/10 border-brand-green/30",
  },
  warning: {
    dot: "bg-brand-yellow",
    text: "text-brand-yellow",
    bg: "bg-brand-yellow/10 border-brand-yellow/30",
  },
  error: {
    dot: "bg-brand-red",
    text: "text-brand-red",
    bg: "bg-brand-red/10 border-brand-red/30",
  },
  pending: {
    dot: "bg-brand-accent",
    text: "text-brand-accent",
    bg: "bg-brand-accent/10 border-brand-accent/30",
  },
};

/**
 * Live status indicator with animated pulsing dot and label text.
 * Used in navbar and telemetry panel.
 */
export function StatusBadge({
  variant = "success",
  label,
  className,
  mono = true,
}: StatusBadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium",
        styles.bg,
        styles.text,
        mono && "font-mono",
        className
      )}
    >
      <span
        className={cn("w-2 h-2 rounded-full animate-pulse-dot", styles.dot)}
        aria-hidden
      />
      {label}
    </span>
  );
}
