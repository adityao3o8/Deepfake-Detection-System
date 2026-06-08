import type { DetectionResult } from "@/types/detection";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

/**
 * Backend origin without trailing slash (no /api suffix).
 * Server-side proxy uses BACKEND_INTERNAL_URL (see next.config.mjs rewrites).
 */
export function getBackendOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  return explicit ?? DEFAULT_BACKEND_URL;
}

/**
 * Full URL for POST /api/detect.
 *
 * Browser on Vercel/local: same-origin /api/proxy/detect → BACKEND_INTERNAL_URL/api/detect
 * Browser with NEXT_PUBLIC_API_URL set: {origin}/api/detect (direct to Render, etc.)
 */
export function getDetectUrl(): string {
  const backendOrigin = getBackendOrigin();
  const isLocalBackend =
    backendOrigin.includes("localhost") ||
    backendOrigin.includes("127.0.0.1");

  if (typeof window !== "undefined") {
    if (!process.env.NEXT_PUBLIC_API_URL || isLocalBackend) {
      return `${window.location.origin}/api/proxy/detect`;
    }
    return `${backendOrigin}/api/detect`;
  }

  return `${backendOrigin}/api/detect`;
}

/** @deprecated Use getDetectUrl() — kept for any callers expecting a base URL */
export function getApiBaseUrl(): string {
  const url = getDetectUrl();
  return url.replace(/\/detect$/, "");
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function detectDeepfake(file: File): Promise<DetectionResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(getDetectUrl(), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = "Detection request failed.";
    try {
      const payload = (await response.json()) as { detail?: string | unknown };
      if (typeof payload.detail === "string") {
        detail = payload.detail;
      } else if (Array.isArray(payload.detail)) {
        detail = payload.detail
          .map((item) =>
            typeof item === "object" && item && "msg" in item
              ? String((item as { msg: string }).msg)
              : String(item)
          )
          .join(", ");
      }
    } catch {
      detail = response.statusText || detail;
    }
    throw new ApiError(detail, response.status);
  }

  return response.json() as Promise<DetectionResult>;
}
