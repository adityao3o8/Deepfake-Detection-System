"use client";

import Image from "next/image";

import type { MediaKind } from "@/lib/media";

interface MediaPreviewProps {
  kind: MediaKind;
  previewUrl: string;
  filename: string;
}

export function MediaPreview({ kind, previewUrl, filename }: MediaPreviewProps) {
  if (kind === "video") {
    return (
      <video
        src={previewUrl}
        controls
        className="max-h-[420px] w-full bg-black object-contain"
        aria-label={`Preview of ${filename}`}
      />
    );
  }

  return (
    <div className="relative aspect-square w-full bg-black/40">
      <Image
        src={previewUrl}
        alt={`Preview of ${filename}`}
        fill
        className="object-contain"
        unoptimized
      />
    </div>
  );
}
