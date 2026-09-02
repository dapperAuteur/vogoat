/**
 * "Continue as <name>" — the silent ecosystem-SSO check, plus global sign-out.
 *
 * THE PROBLEM. /sign-in makes you press a button and bounce to accounts.witus.online even when
 * another tab already has you signed in to a WitUS app. BAM chose OPTION B on 2026-08-30: render
 * the page immediately, ask the IdP who this browser is IN PARALLEL, and relabel the existing
 * button "Continue as <name>" if an answer arrives. Deliberately NOT automatic — an automatic
 * redirect would put IdP latency on every visitor, including the common case of someone signed in
 * nowhere, and it is the design that makes redirect loops easy.
 *
 * WHY A CORS PROBE AND NOT OIDC `prompt=none`. `prompt=none` is a NAVIGATION: you leave the page to
 * ask, which is the automatic design BAM rejected. Asking without leaving needs a hidden iframe,
 * which Safari's ITP blocks anyway. So we ask a purpose-built IdP endpoint over CORS instead, next
 * to a page that has already painted.
 *
 * WHAT IT BUYS AND WHAT IT DOES NOT. The probe carries the IdP's cookie as a THIRD-PARTY cookie, so
 * it answers on Chrome/Edge and answers NOTHING under Safari ITP or Firefox Total Cookie
 * Protection. That is the design, not a bug: a probe that answers nothing renders nothing and the
 * visitor keeps the exact page they already had. A failed silent check must be invisible.
 *
 * THE IDENTITY THIS RETURNS IS DISPLAY COPY. It crosses an origin boundary, so it is
 * client-supplied by definition and MUST NEVER authenticate anyone, gate anything, populate a
 * session, or be sent onward. Clicking "Continue as <name>" runs the real OIDC code flow, which is
 * the only thing that establishes identity here.
 *
 * Pure helpers only: no `server-only`, no next/headers, no window access at module scope, so both
 * the server (env.ts) and the client components can import them and tests/silent-sso.test.ts can
 * exercise them directly.
 */

/** Query param marking "this browser already tried the ecosystem flow". */
export const SSO_ATTEMPT_PARAM = "sso";
export const SSO_ATTEMPT_VALUE = "tried";

/**
 * sessionStorage key for the same marker. Written IMMEDIATELY BEFORE we send the browser to the
 * IdP, never after it comes back: a marker written on return is a marker that does not exist when
 * the return is the thing that failed.
 */
export const SSO_ATTEMPT_STORAGE_KEY = "witus.sso.attempted";

/** How long to wait for the probe before giving up. A silent check that hangs is a broken page. */
export const SILENT_SSO_TIMEOUT_MS = 4000;

/** Longest display name we render. Caps an absurd or hostile value from wrecking the button. */
const MAX_LABEL_LENGTH = 48;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/**
 * OIDC authorization-error codes that mean "the IdP will not finish this without a human".
 *
 * `login_required` / `interaction_required` / `consent_required` / `account_selection_required` are
 * the no-session family; `access_denied` is the one that actually fires on the interactive path —
 * the visitor clicked "Continue as …", the IdP asked them to confirm, and they cancelled.
 *
 * All five want the same response: back to /sign-in, no error shouted, carrying the one-shot marker
 * so the probe does not immediately offer the same doomed button again.
 */
export const SILENT_AUTH_FAILURES = [
  "login_required",
  "interaction_required",
  "consent_required",
  "account_selection_required",
  "access_denied",
] as const;

export function isSilentAuthFailure(error: string | null | undefined): boolean {
  return typeof error === "string" && (SILENT_AUTH_FAILURES as readonly string[]).includes(error);
}

/** Identity shown on the button. Display only, never a credential. */
export type SsoIdentity = {
  /** What "Continue as ___" says. Already de-controlled, trimmed and length-capped. */
  label: string;
};

export type SilentSsoSkip = "not-configured" | "already-attempted" | "already-signed-in";

export type SilentSsoDecision = { attempt: true } | { attempt: false; skip: SilentSsoSkip };

/**
 * Should this browser ask the IdP who it is?
 *
 * `endpoint` is null whenever `WITUS_OIDC_CLIENT_ID` is unset, which is the whole gate. VO GOAT is
 * single-tenant on one WitUS-branded host, so there is no white-label surface to hide the ecosystem
 * from — but an app that is not a registered OIDC client cannot complete the flow, and an
 * affordance the visitor cannot complete is worse than no affordance.
 */
export function silentSsoDecision(input: {
  endpoint: string | null | undefined;
  search?: string | null;
  attempted?: boolean;
  signedIn?: boolean;
}): SilentSsoDecision {
  if (!input.endpoint) return { attempt: false, skip: "not-configured" };
  if (input.signedIn) return { attempt: false, skip: "already-signed-in" };
  if (input.attempted || hasAttemptMarker(input.search)) {
    return { attempt: false, skip: "already-attempted" };
  }
  return { attempt: true };
}

/** Does this query string carry the one-shot marker? Accepts "?a=b" or "a=b". */
export function hasAttemptMarker(search: string | null | undefined): boolean {
  if (typeof search !== "string" || search === "") return false;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get(SSO_ATTEMPT_PARAM) === SSO_ATTEMPT_VALUE;
}

/** Add the one-shot marker to a same-origin path, preserving any query and hash it already has. */
export function withAttemptMarker(path: string): string {
  const [beforeHash, ...hashRest] = path.split("#");
  const hash = hashRest.length > 0 ? `#${hashRest.join("#")}` : "";
  const [pathname, ...queryRest] = beforeHash.split("?");
  const params = new URLSearchParams(queryRest.join("?"));
  params.set(SSO_ATTEMPT_PARAM, SSO_ATTEMPT_VALUE);
  return `${pathname}?${params.toString()}${hash}`;
}

/**
 * Split a discovery URL into the IdP's origin and its better-auth basePath.
 *
 *   https://accounts.witus.online/api/idp/.well-known/openid-configuration
 *     → { origin: "https://accounts.witus.online", basePath: "/api/idp" }
 *
 * Everything below derives from this instead of naming accounts.witus.online a second time, so the
 * one external value this app asserts stays the discovery URL it is already configured with
 * (authoritative-values rule).
 */
function splitDiscoveryUrl(
  discoveryUrl: string | null | undefined,
): { origin: string; basePath: string } | null {
  if (!discoveryUrl) return null;
  let parsed: URL;
  try {
    parsed = new URL(discoveryUrl);
  } catch {
    return null;
  }
  const cut = parsed.pathname.indexOf("/.well-known/");
  if (cut < 0) return null;
  return { origin: parsed.origin, basePath: parsed.pathname.slice(0, cut) };
}

/**
 * The ecosystem session probe: `<idp-origin>/api/ecosystem/session`.
 *
 * A purpose-built endpoint in gemini/witus, NOT better-auth's `/get-session`. `/get-session`
 * returns the full `{ session, user }` and `session` carries the SESSION TOKEN, so credentialed
 * CORS on it would let any ecosystem origin — or an XSS on any one of them — lift a live IdP
 * session across the whole ecosystem. `/api/ecosystem/session` reads the same cookie and answers
 * `{ signedIn: true, user: { name } }` or `{ signedIn: false }`: a name, never a credential.
 */
export function silentSsoEndpointFromDiscovery(
  discoveryUrl: string | null | undefined,
): string | null {
  const parts = splitDiscoveryUrl(discoveryUrl);
  if (!parts) return null;
  return `${parts.origin}/api/ecosystem/session`;
}

/**
 * The IdP's RP-initiated logout endpoint, `<basePath>/oauth2/endsession` — the
 * `end_session_endpoint` the discovery document advertises.
 *
 * BAM chose GLOBAL sign-out on 2026-08-30: signing out of one WitUS app signs you out of all of
 * them. Ending only VO GOAT's session leaves the IdP session alive, so with "Continue as …" live,
 * signing out and coming back would offer to sign you straight back in — which reads as a broken
 * sign-out.
 */
export function endSessionEndpointFromDiscovery(
  discoveryUrl: string | null | undefined,
): string | null {
  const parts = splitDiscoveryUrl(discoveryUrl);
  if (!parts) return null;
  return `${parts.origin}${parts.basePath}/oauth2/endsession`;
}

/**
 * Read a display name out of the probe response.
 *
 * Handles `{ signedIn, user: { name } }`, a bare user object, and the signed-out answer (a 200 with
 * no name). Anything else yields null, which renders nothing.
 */
export function parseSilentSsoIdentity(payload: unknown): SsoIdentity | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const candidate =
    root.user && typeof root.user === "object" ? (root.user as Record<string, unknown>) : root;
  const label = cleanLabel(candidate.name) ?? cleanLabel(candidate.email);
  return label ? { label } : null;
}

function cleanLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(CONTROL_CHARS, "").trim();
  if (!cleaned) return null;
  return cleaned.length > MAX_LABEL_LENGTH
    ? `${cleaned.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…`
    : cleaned;
}

/** Button copy. Kept here so the test pins the exact string the visitor reads. */
export function continueAsLabel(identity: SsoIdentity | null): string {
  return identity ? `Continue as ${identity.label}` : "Sign in with WitUS";
}

/**
 * Turn a failed IdP callback into a quiet return to /sign-in carrying the one-shot marker.
 *
 * Deliberately NARROW: only this app's own witus callback path, and only the five codes in
 * SILENT_AUTH_FAILURES. A real fault (token exchange, issuer mismatch) still surfaces the way it
 * does today rather than being swallowed into a blank sign-in page.
 *
 * This is the half of the loop guard that survives a browser with no usable sessionStorage: without
 * it, a stale IdP session gives probe → "Continue as X" → click → IdP declines → back to /sign-in →
 * probe → forever.
 */
export function silentSsoRecoveryPath(url: URL, signInPath = "/sign-in"): string | null {
  if (!/\/oauth2\/callback\/witus\/?$/.test(url.pathname)) return null;
  if (!isSilentAuthFailure(url.searchParams.get("error"))) return null;
  return withAttemptMarker(signInPath);
}
