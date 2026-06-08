"use client";

import {
  motion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { type ReactNode, useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

export const revealUp: Variants = {
  hidden: { opacity: 0, y: 56, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export const revealScale: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.94, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
};

export const revealLeft: Variants = {
  hidden: { opacity: 0, x: -48, filter: "blur(6px)" },
  visible: { opacity: 1, x: 0, filter: "blur(0px)" },
};

export const revealRight: Variants = {
  hidden: { opacity: 0, x: 48, filter: "blur(6px)" },
  visible: { opacity: 1, x: 0, filter: "blur(0px)" },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.14, delayChildren: 0.06 },
  },
};

const defaultViewport = { once: true, margin: "-12% 0px -8% 0px", amount: 0.25 };

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  variant?: Variants;
  delay?: number;
  duration?: number;
}

export function ScrollReveal({
  children,
  className,
  variant = revealUp,
  delay = 0,
  duration = 0.75,
}: ScrollRevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={defaultViewport}
      variants={variant}
      transition={{ duration, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface ScrollStaggerProps {
  children: ReactNode;
  className?: string;
}

export function ScrollStagger({ children, className }: ScrollStaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={defaultViewport}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface ScrollItemProps {
  children: ReactNode;
  className?: string;
  variant?: Variants;
}

export function ScrollItem({
  children,
  className,
  variant = revealUp,
}: ScrollItemProps) {
  return (
    <motion.div
      variants={variant}
      transition={{ duration: 0.7, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionDivider() {
  return (
    <div className="relative h-24 overflow-hidden sm:h-32">
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        whileInView={{ opacity: 1, scaleX: 1 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 1.1, ease }}
        className="absolute left-1/2 top-1/2 h-px w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 origin-center bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.8, delay: 0.2, ease }}
        className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/80 shadow-[0_0_20px_rgba(96,165,250,0.8)]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.3 }}
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent"
      />
    </div>
  );
}

export function ParallaxSection({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [48, -48]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0.7, 1, 1, 0.75]
  );

  return (
    <section ref={ref} id={id} className={className}>
      <motion.div style={{ y, opacity }}>{children}</motion.div>
    </section>
  );
}
