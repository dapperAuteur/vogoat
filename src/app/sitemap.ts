import type { MetadataRoute } from "next";
import { getDb } from "@/db/client";
import { listArchiveDays } from "@/lib/archive";
import { dayKey } from "@/lib/game/day";
import { env } from "@/lib/env";

/** Static pages plus one entry per past specimen (public archive, BAM 2026-09-02). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = ["/", "/archive", "/about", "/voice-data"].map((path) => ({
    url: `${env.APP_URL}${path}`,
    changeFrequency: (path === "/" ? "daily" : "monthly") as "daily" | "monthly",
  }));
  try {
    const db = await getDb();
    const days = await listArchiveDays(db, dayKey(new Date(), env.DAILY_TIMEZONE), env.LAUNCH_DATE, 5000);
    return [
      ...staticPages,
      ...days.map((day) => ({ url: `${env.APP_URL}/day/${day.dayKey}`, changeFrequency: "yearly" as const })),
    ];
  } catch {
    return staticPages; // a database hiccup must not take the sitemap down
  }
}
