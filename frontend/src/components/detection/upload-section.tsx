"use client";

import { motion } from "framer-motion";
import { FileImage, FileVideo, Loader2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { MediaPreview } from "@/components/detection/media-preview";
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
    <section
      id="upload"
      className="relative scroll-mt-8 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-navy-deep via-navy-mid/50 to-navy-deep" />

      <div className="relative z-10 mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Upload Media
            </h2>
            <p className="mt-2 text-slate-400">
              Drag & drop or browse — images and videos supported
            </p>
          </div>

          <GlassCard strong className="p-6 sm:p-8">
            <div
              className={cn(
                "relative flex flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed p-10 text-center transition-all duration-300",
                isDragging
                  ? "border-blue-400/60 upload-glow-hover bg-blue-500/10"
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
                <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-400/30">
                  <FileImage className="size-7 text-blue-300" />
                </div>
                <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-500/10 ring-1 ring-indigo-400/30">
                  <FileVideo className="size-7 text-indigo-300" />
                </div>
              </div>

              <div className="space-y-2">
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
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => inputRef.current?.click()}
                className="rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
              >
                Browse files
              </button>

              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_MEDIA_TYPES.join(",")}
                className="hidden"
                disabled={isLoading}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {previewUrl && selectedFile && mediaKind && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-6 space-y-4"
              >
                <div className="relative overflow-hidden rounded-xl border border-white/10">
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
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-white">{selectedFile.name}</p>
                    <p className="text-sm capitalize text-slate-400">
                      {mediaKind} · {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onAnalyze}
                    disabled={isLoading}
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
                  </button>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </motion.p>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
