import type { DetectionResult } from "@/types/detection";

/**
 * Resolve the API base URL for the current environment.
 * In the browser on an external host, uses the same-origin Next.js proxy
 * so requests do not target the user's localhost.
 */
export function getApiBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    if (
      !explicit ||
      explicit.includes("localhost") ||
      explicit.includes("127.0.0.1")
    ) {
      return `${window.location.origin}/api/proxy`;
    }
    return explicit;
  }

  return explicit ?? "http://127.0.0.1:8000";
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

  const response = await fetch(`${getApiBaseUrl()}/detect`, {
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
