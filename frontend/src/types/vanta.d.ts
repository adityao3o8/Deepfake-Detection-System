declare module "vanta/dist/vanta.halo.min" {
  import type * as THREE from "three";

  interface VantaHaloOptions {
    el: HTMLElement | string;
    THREE: typeof THREE;
    mouseControls?: boolean;
    touchControls?: boolean;
    gyroControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    backgroundColor?: number;
    baseColor?: number;
    size?: number;
    amplitudeFactor?: number;
  }

  interface VantaEffect {
    destroy: () => void;
  }

  export default function HALO(options: VantaHaloOptions): VantaEffect;
}
