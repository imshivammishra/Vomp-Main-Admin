import type { NextConfig } from "next";

// The admin UI origin (e.g. https://dev-admin.venueonmyplate.com). When set, the
// API returns credentialed CORS headers so the admin UI can call the API on a
// different sub-domain (e.g. https://dev.api.venueonmyplate.com).
const adminOrigin = (process.env.ADMIN_ORIGIN || "").replace(/\/+$/, "");

const adminCorsHeaders = adminOrigin
  ? [
      {
        source: "/api/v1/admin/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: adminOrigin },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Vary", value: "Origin" },
        ],
      },
      {
        source: "/api/health",
        headers: [
          { key: "Access-Control-Allow-Origin", value: adminOrigin },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Vary", value: "Origin" },
        ],
      },
    ]
  : [];

const nextConfig: NextConfig = {
  // PGlite ships a WASM build and sharp ships native bindings; both must run
  // in the Node.js runtime and must not be bundled by the server compiler.
  serverExternalPackages: ["@electric-sql/pglite", "sharp"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./src/lib/db/schema.sql"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async headers() {
    return [
      ...adminCorsHeaders,
      {
        source: "/api/v1/public/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
