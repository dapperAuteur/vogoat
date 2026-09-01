"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { initAnalytics, trackPageview } from "@/lib/analytics";

/** Initializes PostHog (inert without the key) and tracks App Router navigations. */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false; // init's own pageview covers the landing
      return;
    }
    trackPageview(pathname);
  }, [pathname]);

  return null;
}
