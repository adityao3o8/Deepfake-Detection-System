"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { VantaBackground } from "@/components/detection/vanta-background";

export function HeroSection() {
  const scrollToUpload = () => {
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <VantaBackground className="absolute inset-0 h-full w-full" />

      <div className="absolute inset-0 bg-gradient-to-b from-navy-mid/20 via-transparent to-navy-deep" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 mx-auto max-w-4xl px-6 text-center"
      >
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-blue-300/80">
          AI-Powered Media Forensics
        </p>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
          <span className="gradient-text">Deepfake Detection</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-300/90 sm:text-xl">
          Upload any image or video. ViT deepfake detection in seconds.
        </p>
        <motion.button
          type="button"
          onClick={scrollToUpload}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-900/40 transition-shadow hover:shadow-blue-500/30"
        >
          Analyze Now
        </motion.button>
      </motion.div>

      <motion.button
        type="button"
        onClick={scrollToUpload}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-10 z-10 flex flex-col items-center gap-1 text-slate-400 transition-colors hover:text-white"
        aria-label="Scroll to upload"
      >
        <span className="text-xs uppercase tracking-widest">Upload</span>
        <ChevronDown className="size-6 animate-bounce" />
      </motion.button>
    </section>
  );
}
