"use client";

import { cn } from "./GlassPanel";

interface RadarSweepProps {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Animated SVG radar sweep icon. Rotating sweep line with concentric
 * pulse rings. Replaces static Radar icon from lucide-react.
 */
export function RadarSweep({
  size = 20,
  className,
  color = "currentColor",
}: RadarSweepProps) {
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute inset-0"
      >
        {/* Concentric rings */}
        <circle cx="12" cy="12" r="10" opacity="0.25" />
        <circle cx="12" cy="12" r="6" opacity="0.35" />
        <circle cx="12" cy="12" r="2" fill={color} stroke="none" opacity="0.8" />
      </svg>
      {/* Rotating sweep */}
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        className="absolute inset-0 animate-radar-sweep"
      >
        <line
          x1="12"
          y1="12"
          x2="12"
          y2="2"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.9"
        />
        {/* Sweep trail (arc gradient) */}
        <path
          d="M12 12 L12 2 A10 10 0 0 1 21.66 17"
          fill={color}
          opacity="0.08"
        />
      </svg>
    </div>
  );
}
