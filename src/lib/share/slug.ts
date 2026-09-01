import { randomBytes } from "node:crypto";

/** Unguessable share slug (PRD §11): 128 bits, URL-safe, no lookalike ambiguity concerns. */
export function newShareSlug(): string {
  return randomBytes(16).toString("base64url");
}
