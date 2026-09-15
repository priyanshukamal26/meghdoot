"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "./GlassPanel";

interface NumberTickerProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  decimals?: number;
}

/**
 * Animated count-up number ticker. Renders in font-mono (JetBrains Mono).
 * Inspired by Spectrum UI's Number Ticker — implemented with framer-motion
 * useInView to trigger on scroll.
 */
export function NumberTicker({
  value,
  prefix = "",
  suffix = "",
  duration = 1.8,
  className,
  decimals = 0,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;

    const start = 0;
    const end = value;
    const startTime = performance.now();
    const durationMs = duration * 1000;

    function easeOutExpo(t: number) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeOutExpo(progress);
      const current = start + (end - start) * eased;

      if (decimals > 0) {
        setDisplay(current.toFixed(decimals));
      } else {
        setDisplay(Math.round(current).toLocaleString("en-IN"));
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [inView, value, duration, decimals]);

  return (
    <motion.span
      ref={ref}
      className={cn("font-mono tabular-nums", className)}
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={inView ? { opacity: 1, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {prefix}
      {display}
      {suffix}
    </motion.span>
  );
}
