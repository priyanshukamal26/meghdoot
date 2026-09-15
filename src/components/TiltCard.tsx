"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "./GlassPanel";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: number;
}

/**
 * 3D tilt-on-pointer card. Pure mouse-tracking transforms with spring physics.
 * Inspired by Spectrum UI's 3D Tilt Card. Glass-panel base.
 */
export function TiltCard({
  children,
  className,
  glowColor = "rgba(95, 168, 211, 0.15)",
  intensity = 12,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [intensity, -intensity]), {
    stiffness: 200,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-intensity, intensity]), {
    stiffness: 200,
    damping: 30,
  });

  const glareX = useTransform(mouseX, [0, 1], ["-100%", "200%"]);
  const glareY = useTransform(mouseY, [0, 1], ["-100%", "200%"]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      className={cn(
        "relative rounded-2xl overflow-hidden cursor-default",
        "bg-gradient-to-b from-white/[0.06] to-white/[0.02]",
        "backdrop-blur-xl border border-brand-border",
        "shadow-xl glass-grain",
        "transition-shadow duration-300 hover:shadow-2xl",
        className
      )}
      style={{
        perspective: 1000,
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glare layer */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
        style={{
          background: `radial-gradient(circle at ${glareX} ${glareY}, ${glowColor}, transparent 60%)`,
          // Need to use CSS custom properties for the dynamic values
        }}
        aria-hidden
      />
      {/* Content */}
      <div className="relative z-20">{children}</div>
    </motion.div>
  );
}
