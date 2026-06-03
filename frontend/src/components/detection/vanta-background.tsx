"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface VantaBackgroundProps {
  className?: string;
}

export function VantaBackground({ className }: VantaBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let effect: { destroy: () => void } | null = null;
    let mounted = true;

    const init = async () => {
      const HALO = (await import("vanta/dist/vanta.halo.min")).default;

      if (!mounted || !containerRef.current) return;

      effect = HALO({
        el: containerRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        backgroundColor: 0x131a43,
        baseColor: 0x1a5999,
        size: 1.2,
        amplitudeFactor: 1.0,
      });
    };

    init();

    return () => {
      mounted = false;
      effect?.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-hidden
    />
  );
}
