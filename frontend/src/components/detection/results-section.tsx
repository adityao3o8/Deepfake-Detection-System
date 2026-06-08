"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import Image from "next/image";

import { MediaPreview } from "@/components/detection/media-preview";
import {
  ParallaxSection,
  revealLeft,
  revealRight,
  revealScale,
  ScrollItem,
  ScrollReveal,
  ScrollStagger,
} from "@/components/detection/scroll-reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { useCountUp } from "@/hooks/use-count-up";
import type { MediaKind } from "@/lib/media";
import type { DetectionResult } from "@/types/detection";

interface ResultsSectionProps {
  result: DetectionResult;
  previewUrl: string;
  mediaKind: MediaKind;
  onReset: () => void;
}

function formatTimestamp(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ResultsSection({
  result,
  previewUrl,
  mediaKind,
  onReset,
}: ResultsSectionProps) {
  const showAnalysis =
    result.analysis_performed && result.face_detected && !result.warning;

  const confidenceCount = useCountUp(
    result.confidence * 100,
    1400,
    showAnalysis
  );
  const realCount = useCountUp(result.real_confidence * 100, 1400, showAnalysis);
  const fakeCount = useCountUp(result.fake_confidence * 100, 1400, showAnalysis);

  const isFake = result.is_deepfake;
  const isVideo = result.media_type === "video";

  return (
    <ParallaxSection className="relative px-4 py-16 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-navy-deep via-navy-mid/30 to-navy-deep" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 0.5, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="pointer-events-none absolute left-1/2 top-0 size-96 -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl"
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <ScrollReveal className="mb-10 text-center" delay={0.05}>
          <span className="mb-3 inline-block text-xs font-medium uppercase tracking-[0.3em] text-blue-300/70">
            Step 02
          </span>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Analysis Results
          </h2>
          <p className="mt-2 text-slate-400">{result.filename}</p>
        </ScrollReveal>

        {!showAnalysis && (
          <ScrollReveal variant={revealScale}>
            <GlassCard strong className="flex items-start gap-4 p-6">
              <AlertTriangle className="size-6 shrink-0 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-200">No face detected</p>
                <p className="mt-1 text-slate-300">
                  {result.warning ??
                    "Deepfake analysis requires a face to be present."}
                </p>
                {isVideo && result.frames_sampled != null && (
                  <p className="mt-2 text-sm text-slate-500">
                    Checked {result.frames_sampled} sampled frames.
                  </p>
                )}
              </div>
            </GlassCard>
          </ScrollReveal>
        )}

        {showAnalysis && (
          <div className="space-y-8">
            <ScrollReveal
              variant={revealScale}
              delay={0.1}
              className="flex flex-col items-center"
            >
              <p className="mb-2 text-sm uppercase tracking-widest text-slate-400">
                Verdict
              </p>
              <motion.p
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2, type: "spring", stiffness: 120 }}
                className={`text-5xl font-black uppercase tracking-wider sm:text-6xl md:text-7xl ${
                  isFake
                    ? "text-red-400 glow-fake"
                    : "text-emerald-400 glow-real"
                }`}
              >
                {isFake ? "Fake" : "Real"}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="mt-6 text-6xl font-bold tabular-nums text-white sm:text-7xl"
              >
                {Math.round(confidenceCount)}%
              </motion.p>
              <p className="text-sm text-slate-400">confidence</p>
            </ScrollReveal>

            <ScrollStagger className="grid gap-4 sm:grid-cols-2">
              <ScrollItem variant={revealLeft}>
                <GlassCard className="p-5">
                  <p className="text-sm text-slate-400">Real probability</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-400">
                    {Math.round(realCount)}%
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-emerald-500"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${result.real_confidence * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </GlassCard>
              </ScrollItem>
              <ScrollItem variant={revealRight}>
                <GlassCard className="p-5">
                  <p className="text-sm text-slate-400">Fake probability</p>
                  <p className="mt-1 text-3xl font-bold text-red-400">
                    {Math.round(fakeCount)}%
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-red-500"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${result.fake_confidence * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </GlassCard>
              </ScrollItem>
            </ScrollStagger>

            {isVideo && result.frames_analyzed != null && (
              <ScrollReveal delay={0.15}>
                <p className="text-center text-sm text-slate-500">
                  {result.frames_analyzed} face frames analyzed
                  {result.frames_sampled != null &&
                    ` of ${result.frames_sampled} sampled`}
                  {result.video_duration_seconds != null &&
                    ` · ${formatTimestamp(result.video_duration_seconds)}`}
                </p>
              </ScrollReveal>
            )}

            <ScrollStagger className="grid gap-6 lg:grid-cols-2">
              <ScrollItem variant={revealLeft}>
                <GlassCard strong className="overflow-hidden p-4">
                  <p className="mb-3 text-sm font-medium text-slate-300">
                    Original
                  </p>
                  <div className="overflow-hidden rounded-xl border border-white/10">
                    <MediaPreview
                      kind={mediaKind}
                      previewUrl={previewUrl}
                      filename={result.filename}
                    />
                  </div>
                </GlassCard>
              </ScrollItem>

              {result.gradcam_image && (
                <ScrollItem variant={revealRight}>
                  <GlassCard strong className="overflow-hidden p-4">
                    <p className="mb-3 text-sm font-medium text-slate-300">
                      Grad-CAM Heatmap
                      {isVideo && result.gradcam_timestamp_seconds != null && (
                        <span className="text-slate-500">
                          {" "}
                          · {formatTimestamp(result.gradcam_timestamp_seconds)}
                        </span>
                      )}
                    </p>
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
                      <Image
                        src={result.gradcam_image}
                        alt="Grad-CAM heatmap"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </GlassCard>
                </ScrollItem>
              )}
            </ScrollStagger>
          </div>
        )}

        <ScrollReveal delay={0.2} className="mt-12 flex justify-center">
          <motion.button
            type="button"
            onClick={onReset}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full border border-white/20 bg-white/5 px-8 py-3 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
          >
            Analyze another file
          </motion.button>
        </ScrollReveal>
      </div>
    </ParallaxSection>
  );
}
