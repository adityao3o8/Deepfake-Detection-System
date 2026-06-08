"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileImage, FileVideo, Loader2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { MediaPreview } from "@/components/detection/media-preview";
import {
  ParallaxSection,
  ScrollItem,
  ScrollStagger,
} from "@/components/detection/scroll-reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { ACCEPTED_MEDIA_TYPES, formatFileSize, type MediaKind } from "@/lib/media";
import { cn } from "@/lib/utils";

interface UploadSectionProps {
  selectedFile: File | null;
  mediaKind: MediaKind | null;
  previewUrl: string | null;
  isLoading: boolean;
  error: string | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  onAnalyze: () => void;
}

export function UploadSection({
  selectedFile,
  mediaKind,
  previewUrl,
  isLoading,
  error,
  onFileSelect,
  onClear,
  onAnalyze,
}: UploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const loadingLabel =
    mediaKind === "video" ? "Analyzing video…" : "Analyzing image…";

  return (
    <ParallaxSection
      id="upload"
      className="relative scroll-mt-8 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-navy-deep via-navy-mid/50 to-navy-deep" />

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 1.2 }}
        className="pointer-events-none absolute left-1/4 top-20 size-64 rounded-full bg-blue-500/10 blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.6 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 1.4, delay: 0.2 }}
        className="pointer-events-none absolute bottom-10 right-1/4 size-72 rounded-full bg-indigo-500/10 blur-3xl"
      />

      <div className="relative z-10 mx-auto max-w-3xl">
        <ScrollStagger className="space-y-8">
          <ScrollItem className="text-center">
            <motion.span
              initial={{ opacity: 0, letterSpacing: "0.5em" }}
              whileInView={{ opacity: 1, letterSpacing: "0.3em" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="mb-3 inline-block text-xs font-medium uppercase text-blue-300/70"
            >
              Step 01
            </motion.span>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Upload Media
            </h2>
            <p className="mt-2 text-slate-400">
              Drag & drop or browse — images and videos supported
            </p>
          </ScrollItem>

          <ScrollItem>
            <GlassCard strong className="p-6 sm:p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-5%" }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed p-10 text-center transition-all duration-300",
                  isDragging
                    ? "border-blue-400/60 upload-glow-hover bg-blue-500/10 scale-[1.01]"
                    : "border-white/20 upload-glow hover:upload-glow-hover hover:border-blue-400/40",
                  isLoading && "pointer-events-none opacity-60"
                )}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFiles(e.dataTransfer.files);
                }}
              >
                <div className="flex gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20, rotate: -8 }}
                    whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.25 }}
                    className="flex size-14 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-400/30"
                  >
                    <FileImage className="size-7 text-blue-300" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20, rotate: 8 }}
                    whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                    className="flex size-14 items-center justify-center rounded-2xl bg-indigo-500/10 ring-1 ring-indigo-400/30"
                  >
                    <FileVideo className="size-7 text-indigo-300" />
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="space-y-2"
                >
                  <Upload className="mx-auto size-8 text-slate-400" />
                  <p className="text-lg font-medium text-white">
                    Drop your file here
                  </p>
                  <p className="text-sm text-slate-400">
                    JPEG, PNG, WebP · MP4, WebM, MOV
                  </p>
                  <p className="text-xs text-slate-500">
                    Images up to 10 MB · Videos up to 100 MB
                  </p>
                </motion.div>

                <motion.button
                  type="button"
                  disabled={isLoading}
                  onClick={() => inputRef.current?.click()}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: 0.5 }}
                  className="rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                  Browse files
                </motion.button>

                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED_MEDIA_TYPES.join(",")}
                  className="hidden"
                  disabled={isLoading}
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </motion.div>

              <AnimatePresence mode="wait">
                {previewUrl && selectedFile && mediaKind && (
                  <motion.div
                    key={selectedFile.name}
                    initial={{ opacity: 0, y: 32, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -16, scale: 0.98 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-6 space-y-4"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1, duration: 0.5 }}
                      className="relative overflow-hidden rounded-xl border border-white/10"
                    >
                      <MediaPreview
                        kind={mediaKind}
                        previewUrl={previewUrl}
                        filename={selectedFile.name}
                      />
                      <button
                        type="button"
                        onClick={onClear}
                        disabled={isLoading}
                        className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                        aria-label="Remove file"
                      >
                        <X className="size-4" />
                      </button>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.45 }}
                      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-white">{selectedFile.name}</p>
                        <p className="text-sm capitalize text-slate-400">
                          {mediaKind} · {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <motion.button
                        type="button"
                        onClick={onAnalyze}
                        disabled={isLoading}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 font-semibold text-white shadow-lg shadow-blue-900/30 disabled:opacity-60"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="size-5 animate-spin" />
                            {loadingLabel}
                          </>
                        ) : (
                          "Run Analysis"
                        )}
                      </motion.button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: 8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className="mt-4 overflow-hidden rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </GlassCard>
          </ScrollItem>
        </ScrollStagger>
      </div>
    </ParallaxSection>
  );
}
