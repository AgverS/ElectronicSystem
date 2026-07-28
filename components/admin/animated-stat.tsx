"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export function AnimatedStat({
  value,
  delay = 0,
}: {
  value: number;
  delay?: number;
}) {
  const raw = useMotionValue(0);
  const spring = useSpring(raw, { stiffness: 80, damping: 18, restDelta: 0.5 });
  const display = useTransform(spring, (v) => Math.round(v).toString());

  useEffect(() => {
    const t = setTimeout(() => raw.set(value), delay * 1000);
    return () => clearTimeout(t);
  }, [raw, value, delay]);

  return <motion.span>{display}</motion.span>;
}
