import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SILENT_AUTH_FAILURES,
  SSO_ATTEMPT_STORAGE_KEY,
  continueAsLabel,
  endSessionEndpointFromDiscovery,
  hasAttemptMarker,
  isSilentAuthFailure,
  parseSilentSsoIdentity,
  silentSsoDecision,
  silentSsoEndpointFromDiscovery,
  silentSsoRecoveryPath,
  withAttemptMarker,
} from "@/lib/silent-sso";

/**
 * The silent ecosystem-SSO check ("Continue as <name>") and global sign-out.
 *
 * Pinned in order of what each would cost if it broke:
 *   1. THE DARK GATE. With no OIDC client, VO GOAT must not touch accounts.witus.online at all and
 *      must not offer an affordance nobody can complete.
 *   2. THE REDIRECT LOOP. probe → "Continue as X" → click → IdP declines → back to /sign-in →
 *      probe → forever. It never shows up in normal use, so it is simulated end to end below.
 *   3. THE NAME IS NOT A CREDENTIAL. Nothing the probe returns may render unsanitised or claim
 *      anything about who the visitor is.
 *   4. THE LOGOUT URL. The trailing slash and the client_id are both load-bearing; either one
 *      missing is a 400 from the IdP.
 */

const ROOT = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8");

/** Assertions about what the CODE does must not be satisfied (or broken) by a comment. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const DISCOVERY = "https://accounts.witus.online/api/idp/.well-known/openid-configuration";
const ENDPOINT = "https://accounts.witus.online/api/ecosystem/session";

describe("the dark gate: no configured client, no probe", () => {
  it("skips with `not-configured` however positive everything else looks", () => {
    for (const endpoint of [null, undefined, ""]) {
      for (const search of ["", "?sso=tried"]) {
        for (const signedIn of [false, true]) {
          expect(silentSsoDecision({ endpoint, search, signedIn })).toEqual({
            attempt: false,
            skip: "not-configured",
          });
        }
      }
    }
  });

  it("skips when the visitor is already signed in locally", () => {
    expect(silentSsoDecision({ endpoint: ENDPOINT, signedIn: true })).toEqual({
      attempt: false,
      skip: "already-signed-in",
    });
  });

  it("attempts on a configured client and a clean first visit", () => {
    expect(silentSsoDecision({ endpoint: ENDPOINT, search: "" })).toEqual({ attempt: true });
  });

  it("env.ts leaves BOTH endpoints null unless WITUS_OIDC_CLIENT_ID is set", () => {
    const env = stripComments(read("src/lib/env.ts"));
    expect(env).toMatch(/witusSilentSsoEndpoint[\s\S]{0,120}hasWitusSso\s*\n?\s*\?/);
    expect(env).toMatch(/witusEndSessionEndpoint[\s\S]{0,160}if \(!hasWitusSso\) return null;/);
  });
});

describe("the loop guard", () => {
  it("skips the probe once either half of the marker is present", () => {
    expect(silentSsoDecision({ endpoint: ENDPOINT, search: "?sso=tried" })).toEqual({
      attempt: false,
      skip: "already-attempted",
    });
    expect(silentSsoDecision({ endpoint: ENDPOINT, search: "", attempted: true })).toEqual({
      attempt: false,
      skip: "already-attempted",
    });
  });

  it("reads the marker with or without a leading `?`, and ignores near-misses", () => {
    expect(hasAttemptMarker("?sso=tried")).toBe(true);
    expect(hasAttemptMarker("sso=tried")).toBe(true);
    expect(hasAttemptMarker("?next=/menagerie&sso=tried")).toBe(true);
    expect(hasAttemptMarker("?sso=1")).toBe(false);
    expect(hasAttemptMarker("?ssoo=tried")).toBe(false);
    expect(hasAttemptMarker("")).toBe(false);
    expect(hasAttemptMarker(null)).toBe(false);
  });

  it("adds the marker without losing an existing query or hash", () => {
    expect(withAttemptMarker("/sign-in")).toBe("/sign-in?sso=tried");
    expect(withAttemptMarker("/sign-in?from=share")).toBe("/sign-in?from=share&sso=tried");
    expect(withAttemptMarker("/sign-in#form")).toBe("/sign-in?sso=tried#form");
  });

  it("closes the loop end to end: a declined callback returns to a page that will not re-probe", () => {
    for (const code of SILENT_AUTH_FAILURES) {
      const url = new URL(`https://vogoat.witus.online/api/auth/oauth2/callback/witus?error=${code}`);
      const back = silentSsoRecoveryPath(url);
      expect(back).toBe("/sign-in?sso=tried");
      expect(silentSsoDecision({ endpoint: ENDPOINT, search: new URL(back!, url).search })).toEqual({
        attempt: false,
        skip: "already-attempted",
      });
    }
  });

  it("leaves real faults alone — only the five no-human codes recover quietly", () => {
    const base = "https://vogoat.witus.online/api/auth/oauth2/callback/witus";
    expect(silentSsoRecoveryPath(new URL(`${base}?error=server_error`))).toBeNull();
    expect(silentSsoRecoveryPath(new URL(`${base}?code=abc&state=xyz`))).toBeNull();
    // Not our provider's callback path.
    expect(silentSsoRecoveryPath(new URL("https://vogoat.witus.online/sign-in?error=access_denied"))).toBeNull();
    expect(isSilentAuthFailure("token_exchange_failed")).toBe(false);
    expect(isSilentAuthFailure(null)).toBe(false);
  });

  it("the button writes the marker BEFORE it redirects, never after the return", () => {
    const src = stripComments(read("src/components/auth/witus-sso-button.tsx"));
    // The key comes from the shared module, so a rename cannot silently split the two halves.
    expect(src).toContain("SSO_ATTEMPT_STORAGE_KEY");
    expect(SSO_ATTEMPT_STORAGE_KEY).toBe("witus.sso.attempted");
    expect(src.indexOf("writeAttempted()")).toBeGreaterThan(-1);
    // The call site, not the import: the marker must be written before the redirect starts.
    expect(src.indexOf("writeAttempted()")).toBeLessThan(src.indexOf('signInWithWitus("/")'));
    // sessionStorage throws outright in some privacy modes; both halves must be wrapped.
    expect(src).toMatch(/function readAttempted[\s\S]*?try \{[\s\S]*?\} catch \{/);
    expect(src).toMatch(/function writeAttempted[\s\S]*?try \{[\s\S]*?\} catch \{/);
  });
});

describe("the name is display copy, never a credential", () => {
  it("reads the IdP's `{ signedIn, user: { name } }` answer", () => {
    expect(parseSilentSsoIdentity({ signedIn: true, user: { name: "Brand" } })).toEqual({
      label: "Brand",
    });
  });

  it("renders nothing for every shape that is not a name", () => {
    for (const payload of [null, undefined, "Brand", 42, {}, { signedIn: false }, { user: null }, { user: { name: "   " } }]) {
      expect(parseSilentSsoIdentity(payload)).toBeNull();
    }
  });

  it("strips control characters and trims before anything is rendered", () => {
    expect(parseSilentSsoIdentity({ user: { name: "  Br\u0000a\u001Fnd\u007F  " } })).toEqual({
      label: "Brand",
    });
  });

  it("caps an absurd name at 48 characters with an ellipsis", () => {
    const found = parseSilentSsoIdentity({ user: { name: "G".repeat(400) } });
    expect(found?.label).toHaveLength(48);
    expect(found?.label.endsWith("…")).toBe(true);
  });

  it("says the ordinary thing when the probe found nobody", () => {
    expect(continueAsLabel(null)).toBe("Sign in with WitUS");
    expect(continueAsLabel({ label: "Brand" })).toBe("Continue as Brand");
  });

  it("the probe's failure paths are silent — no error state, no thrown rejection", () => {
    const src = stripComments(read("src/components/auth/witus-sso-button.tsx"));
    expect(src).toMatch(/\.catch\(\(\) => \{\s*\}\)/);
    expect(src).toContain("controller.abort()");
    expect(src).toContain("SILENT_SSO_TIMEOUT_MS");
    // A non-OK response must degrade to "nobody", not to a parse error.
    expect(src).toContain("res.ok ? res.json() : null");
  });
});

describe("endpoints derive from the discovery URL, and only from it", () => {
  it("splits origin and basePath correctly", () => {
    expect(silentSsoEndpointFromDiscovery(DISCOVERY)).toBe(ENDPOINT);
    expect(endSessionEndpointFromDiscovery(DISCOVERY)).toBe(
      "https://accounts.witus.online/api/idp/oauth2/endsession",
    );
  });

  it("follows a self-hosted or staging IdP rather than hardcoding accounts.witus.online", () => {
    const local = "http://localhost:3000/api/idp/.well-known/openid-configuration";
    expect(silentSsoEndpointFromDiscovery(local)).toBe("http://localhost:3000/api/ecosystem/session");
    expect(endSessionEndpointFromDiscovery(local)).toBe(
      "http://localhost:3000/api/idp/oauth2/endsession",
    );
  });

  it("returns null rather than a broken URL for junk input", () => {
    for (const bad of [null, undefined, "", "not a url", "https://accounts.witus.online/api/idp"]) {
      expect(silentSsoEndpointFromDiscovery(bad)).toBeNull();
      expect(endSessionEndpointFromDiscovery(bad)).toBeNull();
    }
  });

  it("names the IdP host exactly once in the app", () => {
    // The authoritative-values rule: one fallback, labelled, in env.ts. Everything else derives.
    const hits = ["src/lib/env.ts", "src/lib/auth.ts", "src/lib/silent-sso.ts"].flatMap((f) =>
      stripComments(read(f)).match(/accounts\.witus\.online/g) ?? [],
    );
    expect(hits).toHaveLength(1);
  });
});

describe("global sign-out", () => {
  it("destroys the local session BEFORE handing off to the IdP", () => {
    const src = stripComments(read("src/components/auth/sign-out-button.tsx"));
    const signOut = src.indexOf("authClient");
    const handoff = src.indexOf("window.location.assign(\n");
    expect(signOut).toBeGreaterThan(-1);
    expect(handoff).toBeGreaterThan(signOut);
  });

  it("sends the trailing-slash post_logout_redirect_uri better-auth exact-matches", () => {
    const src = stripComments(read("src/components/auth/sign-out-button.tsx"));
    expect(src).toContain("`${window.location.origin}/`");
    expect(src).toContain("post_logout_redirect_uri=${encodeURIComponent(back)}");
    // `&`, not `?`: the server already appended client_id.
    expect(src).toContain("`${endSessionUrl}&post_logout_redirect_uri=");
  });

  it("bakes the REQUIRED client_id into the URL on the server", () => {
    const env = stripComments(read("src/lib/env.ts"));
    expect(env).toContain("client_id=${encodeURIComponent(env.WITUS_OIDC_CLIENT_ID as string)}");
  });

  it("keeps the /goodbye landing when there is no shared session to end", () => {
    const src = stripComments(read("src/components/auth/sign-out-button.tsx"));
    expect(src).toContain('window.location.assign("/goodbye")');
    expect(src).toContain('endSessionUrl ? "Sign out of WitUS" : "Sign out"');
  });
});
