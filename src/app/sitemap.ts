import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/about", "/voice-data"].map((path) => ({
    url: `${env.APP_URL}${path}`,
    changeFrequency: path === "/" ? "daily" : "monthly",
  }));
}
