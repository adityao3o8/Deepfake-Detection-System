export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
] as const;

export const VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
] as const;

export const ACCEPTED_MEDIA_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export type MediaKind = "image" | "video";

export function getMediaKind(file: File): MediaKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";

  const ext = file.name.toLowerCase().split(".").pop();
  if (ext && ["jpg", "jpeg", "png", "webp", "bmp"].includes(ext)) return "image";
  if (ext && ["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  return null;
}

export function getMaxBytes(kind: MediaKind): number {
  return kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}
