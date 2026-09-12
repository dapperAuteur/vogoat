/**
 * Event taxonomy for vogoat.witus.online.
 *
 * The ecosystem shares ONE PostHog project, separated by the `app` property that
 * posthog-provider registers on load (and server.ts stamps on server events). Two rules keep
 * that project readable, and both are cheap now and expensive to retrofit once data has landed:
 *
 *   1. `snake_case`, object first, verb in past tense — `take_kept`.
 *   2. NEVER put the app name in the event name. `vogoat_take_kept` is wrong: the `app`
 *      property already carries that, and a prefixed name kills cross-app comparison.
 *
 * Properties are closed enums, counts, and booleans only. Never an id, an email, a name, a share
 * slug, or anything a player typed, and never audio: the voice-data promise covers analytics too.
 *
 * See gemini/witus/plans/26-posthog-ecosystem-rollout.md for the full contract.
 */

/** Matches this app's slug in gemini/witus/lib/identity/clients.ts. Every event carries it. */
export const ANALYTICS_APP = "vogoat";

/**
 * Events with identical names across every ecosystem app. Names are contractual.
 */
export const SHARED_EVENTS = {
  signinStarted: "signin_started",
  signinSucceeded: "signin_succeeded",
  signinFailed: "signin_failed",
} as const;

/**
 * Events specific to VO GOAT. They follow the PRD §15 funnel (recipe seen, take started, take
 * kept, take submitted, card shared), so the drop-off between steps is a ratio between events,
 * which stays valid even though `persistence: "memory"` inflates absolute visitor counts.
 */
export const EVENTS = {
  /** An explicit route view. capture_pageview is off: Next's client router would fire it once
   *  and then under-report every client-side navigation. */
  routeViewed: "route_viewed",
  /** Lifecycle names plan 26 uses across apps; server-side, from the auth and billing paths. */
  signupCompleted: "signup_completed",
  checkoutStarted: "checkout_started",
  purchaseCompleted: "purchase_completed",
  /** A recording actually started. `signed_in` false is anonymous rehearsal. */
  takeStarted: "take_started",
  /** `format` is "mp3", or "original" when this browser could not convert (the fallback rate). */
  takeKept: "take_kept",
  /** `stage` is "review" (never uploaded) or "kept" (uploaded, then deleted). */
  takeDiscarded: "take_discarded",
  takeSubmitted: "take_submitted",
  /** Server-side, from the audio routes. `kind` is "daily" or "practice". */
  takeDownloaded: "take_downloaded",
  shareCardCopied: "share_card_copied",
  shareLinkCreated: "share_link_created",
  shareLinkCopied: "share_link_copied",
  shareLinkRevoked: "share_link_revoked",
  reportSubmitted: "report_submitted",
  practiceTakeSaved: "practice_take_saved",
  ...SHARED_EVENTS,
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
