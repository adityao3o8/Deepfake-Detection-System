"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import Image from "next/image";

import { MediaPreview } from "@/components/detection/media-preview";
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

const fadeIn = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

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
    <section className="relative px-4 py-16 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-navy-deep via-navy-mid/30 to-navy-deep" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          {...fadeIn}
          className="mb-10 text-center"
        >
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Analysis Results
          </h2>
          <p className="mt-2 text-slate-400">{result.filename}</p>
        </motion.div>

        {!showAnalysis && (
          <motion.div {...fadeIn}>
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
          </motion.div>
        )}

        {showAnalysis && (
          <div className="space-y-8">
            <motion.div
              {...fadeIn}
              className="flex flex-col items-center"
            >
              <p className="mb-2 text-sm uppercase tracking-widest text-slate-400">
                Verdict
              </p>
              <p
                className={`text-5xl font-black uppercase tracking-wider sm:text-6xl md:text-7xl ${
                  isFake
                    ? "text-red-400 glow-fake"
                    : "text-emerald-400 glow-real"
                }`}
              >
                {isFake ? "Fake" : "Real"}
              </p>
              <p className="mt-6 text-6xl font-bold tabular-nums text-white sm:text-7xl">
                {Math.round(confidenceCount)}%
              </p>
              <p className="text-sm text-slate-400">confidence</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <GlassCard className="p-5">
                <p className="text-sm text-slate-400">Real probability</p>
                <p className="mt-1 text-3xl font-bold text-emerald-400">
                  {Math.round(realCount)}%
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${result.real_confidence * 100}%` }}
                    transition={{ delay: 0.3, duration: 1 }}
                  />
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-sm text-slate-400">Fake probability</p>
                <p className="mt-1 text-3xl font-bold text-red-400">
                  {Math.round(fakeCount)}%
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-red-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${result.fake_confidence * 100}%` }}
                    transition={{ delay: 0.3, duration: 1 }}
                  />
                </div>
              </GlassCard>
            </motion.div>

            {isVideo && result.frames_analyzed != null && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-center text-sm text-slate-500"
              >
                {result.frames_analyzed} face frames analyzed
                {result.frames_sampled != null &&
                  ` of ${result.frames_sampled} sampled`}
                {result.video_duration_seconds != null &&
                  ` · ${formatTimestamp(result.video_duration_seconds)}`}
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="grid gap-6 lg:grid-cols-2"
            >
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

              {result.gradcam_image && (
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
              )}
            </motion.div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex justify-center"
        >
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-white/20 bg-white/5 px-8 py-3 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
          >
            Analyze another file
          </button>
        </motion.div>
      </div>
    </section>
  );
}
