"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { HeroSection } from "@/components/detection/hero-section";
import { ResultsSection } from "@/components/detection/results-section";
import { SectionDivider } from "@/components/detection/scroll-reveal";
import { UploadSection } from "@/components/detection/upload-section";
import { ApiError, detectDeepfake } from "@/lib/api";
import {
  formatFileSize,
  getMaxBytes,
  getMediaKind,
  type MediaKind,
} from "@/lib/media";
import type { DetectionResult } from "@/types/detection";

export function DetectionClient() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaKind, setMediaKind] = useState<MediaKind | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    if (result) {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [result]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setMediaKind(null);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setSelectedFile(null);
    setMediaKind(null);
    setResult(null);
    setError(null);
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setError(null);
    setResult(null);

    const kind = getMediaKind(file);
    if (!kind) {
      setError(
        "Please upload an image (JPEG, PNG, WebP) or video (MP4, WebM, MOV)."
      );
      return;
    }

    const maxBytes = getMaxBytes(kind);
    if (file.size > maxBytes) {
      setError(
        `File must be ${formatFileSize(maxBytes)} or smaller for ${kind} uploads.`
      );
      return;
    }

    setMediaKind(kind);
    setSelectedFile(file);
  }, []);

  const runDetection = useCallback(async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const detection = await detectDeepfake(selectedFile);
      setResult(detection);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof TypeError) {
        setError(
          "Could not reach the API. Ensure the backend is running and reachable."
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile]);

  return (
    <main className="min-h-screen bg-navy-deep">
      <HeroSection />

      <SectionDivider />

      <UploadSection
        selectedFile={selectedFile}
        mediaKind={mediaKind}
        previewUrl={previewUrl}
        isLoading={isLoading}
        error={error}
        onFileSelect={handleFileSelect}
        onClear={clearFile}
        onAnalyze={runDetection}
      />

      <AnimatePresence mode="wait">
        {result && previewUrl && mediaKind && (
          <motion.div
            id="results"
            key={result.filename}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.4 }}
          >
            <SectionDivider />
            <ResultsSection
              result={result}
              previewUrl={previewUrl}
              mediaKind={mediaKind}
              onReset={reset}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.footer
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="border-t border-white/5 py-8 text-center text-sm text-slate-500"
      >
        <p>Deepfake Detection System · EfficientNet-B0</p>
        <a
          href="https://github.com/adityao3o8/Deepfake-Detection-System"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-slate-400 transition-colors hover:text-blue-300"
        >
          View on GitHub
        </a>
      </motion.footer>
    </main>
  );
}
