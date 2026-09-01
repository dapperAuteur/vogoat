import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/wasm-backed packages must not be bundled: the Neon driver's `ws` transport
  // breaks under the minifier (same fix as the sibling apps), and PGlite (the zero-setup
  // local database used when DATABASE_URL is unset) loads its wasm from node_modules.
  serverExternalPackages: ["@neondatabase/serverless", "ws", "@electric-sql/pglite"],

  // PostHog's endpoints use trailing slashes; without this Next 308s to the slashless form
  // before the rewrite runs and ingest breaks (PostHog's documented Next.js proxy setup).
  // Side effect: disables the automatic trailing-slash redirect for every route.
  skipTrailingSlashRedirect: true,

  async rewrites() {
    // Reverse-proxy PostHog through our origin so content blockers have nothing to match on.
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
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
