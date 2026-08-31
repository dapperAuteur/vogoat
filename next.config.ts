import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/wasm-backed packages must not be bundled: the Neon driver's `ws` transport
  // breaks under the minifier (same fix as the sibling apps), and PGlite (the zero-setup
  // local database used when DATABASE_URL is unset) loads its wasm from node_modules.
  serverExternalPackages: ["@neondatabase/serverless", "ws", "@electric-sql/pglite"],
  async headers() {
    return [
      {
        // Share pages are unguessable links, never indexed (PRD §11).
        source: "/s/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
