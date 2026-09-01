import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/s/", "/menagerie", "/sign-in"] }],
    sitemap: `${env.APP_URL}/sitemap.xml`,
  };
}
