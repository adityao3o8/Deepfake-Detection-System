import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND = "http://127.0.0.1:8000";

function getBackendOrigin(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_BACKEND
  ).replace(/\/$/, "");
}

async function proxyToBackend(
  request: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  const target = `${getBackendOrigin()}/api/${pathSegments.join("/")}`;
  const contentType = request.headers.get("content-type");

  const headers: HeadersInit = {};
  if (contentType) {
    headers["content-type"] = contentType;
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
  });

  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}

type RouteContext = { params: { path: string[] } };

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context.params.path);
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context.params.path);
}
