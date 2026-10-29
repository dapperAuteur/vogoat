/**
 * Sign-out semantics (BAM, 2026-10-29, witus task 128 option (b)).
 *
 * - "Sign out" ends ONLY the VO GOAT session and lands on /goodbye. It never navigates to the IdP,
 *   so the WitUS session and every other WitUS app stay signed in.
 * - "Sign out of WitUS everywhere" is a second control. It ends the VO GOAT session, then sends
 *   the browser to the IdP's RP-initiated logout endpoint, which ends the WitUS session. Other
 *   WitUS apps keep their own sessions until you sign out of them (the IdP has no back-channel
 *   logout), and the help text says so.
 *
 * This replaces the 2026-08-30 behaviour where the plain button also ended the WitUS session.
 * Pure helpers only (no window, no React) so tests drive them with fakes.
 */

export const SIGN_OUT_LABEL = "Sign out";
export const SIGN_OUT_EVERYWHERE_LABEL = "Sign out of WitUS everywhere";
export const SIGN_OUT_EVERYWHERE_HELP =
  "Also signs you out of WitUS. Other WitUS apps you are signed in to stay signed in until you sign out of them.";
export const SIGN_OUT_PENDING_LABEL = "Signing out…";

/** Where plain "Sign out" lands: the come-back-tomorrow page (BAM, 2026-09-02). */
export const LOCAL_SIGN_OUT_DESTINATION = "/goodbye";

/**
 * The IdP logout URL for "Sign out of WitUS everywhere".
 *
 * `endSessionUrl` is `witusEndSessionEndpoint` from src/lib/env.ts: the IdP's endsession endpoint
 * with the REQUIRED `?client_id=…` already baked in on the server. `&`, not `?`, for that reason.
 *
 * Trailing slash is REQUIRED. better-auth exact-matches post_logout_redirect_uri against the
 * client's registered redirectUrls, and gemini/witus registers `https://vogoat.witus.online/`
 * (EcosystemApp.postLogoutPath defaults to "/"). Drop the slash and the IdP answers
 * invalid_request. The IdP returns the browser to the home page, not /goodbye: the registered URI
 * is the app origin and nothing else.
 */
export function endSessionNavigationUrl(endSessionUrl: string, origin: string): string {
  return `${endSessionUrl}&post_logout_redirect_uri=${encodeURIComponent(`${origin}/`)}`;
}

/** Plain "Sign out": this app only. Deliberately takes no IdP URL. */
export async function signOutHere(deps: {
  signOut: () => Promise<unknown>;
  navigate: (url: string) => void;
}): Promise<void> {
  try {
    await deps.signOut();
  } catch {
    // Still leave: a failed sign-out call must not strand the person on a half-signed-out page.
  }
  deps.navigate(LOCAL_SIGN_OUT_DESTINATION);
}

/** "Sign out of WitUS everywhere": this app's session first, then the IdP. */
export async function signOutEverywhere(deps: {
  signOut: () => Promise<unknown>;
  navigate: (url: string) => void;
  endSessionUrl: string;
  origin: string;
}): Promise<void> {
  // ORDER IS THE SAFETY PROPERTY. Destroy the LOCAL session first, then hand off. If the IdP is
  // unreachable or refuses the logout, the person is still signed out HERE. Never hand off first:
  // that turns any IdP failure into "I clicked sign out and I'm still signed in".
  try {
    await deps.signOut();
  } catch {
    // Swallowed: the hand-off below still ends the WitUS session.
  }
  deps.navigate(endSessionNavigationUrl(deps.endSessionUrl, deps.origin));
}
