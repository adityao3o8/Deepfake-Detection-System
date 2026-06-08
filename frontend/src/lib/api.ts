import type { DetectionResult } from "@/types/detection";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";
/** Render free tier cold starts can take ~60s */
const DETECT_TIMEOUT_MS = 120_000;

/**
 * Backend origin without trailing slash (server-side proxy target).
 */
export function getBackendOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  return explicit ?? DEFAULT_BACKEND_URL;
}

/**
 * Detection endpoint used by the browser.
 * Always same-origin /api/proxy/detect → BACKEND_INTERNAL_URL/api/detect
 * (avoids CORS and works with runtime env on Vercel).
 */
export function getDetectUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/proxy/detect`;
  }
  const backend = getBackendOrigin();
  return `${backend}/api/detect`;
}

/** @deprecated Use getDetectUrl() */
export function getApiBaseUrl(): string {
  return getDetectUrl().replace(/\/detect$/, "");
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DETECT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(getDetectUrl(), {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(
        "The server took too long to respond. If using Render free tier, wait ~60s and try again (cold start).",
        504
      );
    }
    throw new ApiError(
      "Could not reach the API. Check BACKEND_INTERNAL_URL on Vercel and that the Render backend is running.",
      0
    );
  } finally {
    clearTimeout(timeout);
  }

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
