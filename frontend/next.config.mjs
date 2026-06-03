/** @type {import('next').NextConfig} */
const backendUrl =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

const nextConfig = {
  transpilePackages: ["three"],
  ...(process.env.NEXT_BASE_PATH
    ? { basePath: process.env.NEXT_BASE_PATH }
    : {}),

  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
    ],
    unoptimized: true,
  },

  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
