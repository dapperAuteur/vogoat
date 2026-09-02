import { describe, expect, it } from "vitest";
import { GUIDES, guideBySlug } from "@/lib/how-to/guides";

// House copy rules for the help section (BAM, 2026-09-02).
const BANNED_WORDS = [
  "delve",
  "crucial",
  "vital",
  "seamless",
  "myriad",
  "revolutionary",
  "game-changing",
  "powerful",
];
const LONG_DASHES = /[–—]/;

function textOf(guide: (typeof GUIDES)[number]): string {
  return [guide.title, guide.blurb, guide.note ?? "", ...guide.steps].join("\n");
}

describe("how-to guides", () => {
  it("ships a guide for every user-facing capability", () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(9);
  });

  it("gives every guide a unique, url-safe slug", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug, slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("looks a guide up by its slug", () => {
    for (const guide of GUIDES) expect(guideBySlug(guide.slug)).toBe(guide);
    expect(guideBySlug("not-a-guide")).toBeUndefined();
  });

  it("gives every guide a title, a blurb, and at least three steps", () => {
    for (const guide of GUIDES) {
      expect(guide.title.length, guide.slug).toBeGreaterThan(0);
      expect(guide.blurb.length, guide.slug).toBeGreaterThan(0);
      expect(guide.steps.length, guide.slug).toBeGreaterThanOrEqual(3);
      for (const step of guide.steps) expect(step.trim(), guide.slug).not.toBe("");
    }
  });

  it("uses none of the banned words", () => {
    for (const guide of GUIDES) {
      const text = textOf(guide).toLowerCase();
      for (const word of BANNED_WORDS) {
        expect(new RegExp(`\\b${word}\\b`).test(text), `${guide.slug} uses "${word}"`).toBe(false);
      }
    }
  });

  it("uses no em or en dashes", () => {
    for (const guide of GUIDES) {
      expect(LONG_DASHES.test(textOf(guide)), `${guide.slug} has a long dash`).toBe(false);
    }
  });

  it("keeps every video slot fillable with a single id", () => {
    for (const guide of GUIDES) {
      if (guide.videoId === null) continue;
      expect(guide.videoId, guide.slug).toMatch(/^[\w-]{11}$/);
    }
  });
});
