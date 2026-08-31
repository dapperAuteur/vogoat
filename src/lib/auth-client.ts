import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Browser client. baseURL defaults to the current origin, correct for both
// local dev (:3050) and production (vogoat.witus.online).
export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});

/**
 * Starts the "Sign in with WitUS" OAuth flow. This better-auth version ships no
 * genericOAuth client plugin, so the endpoint is called directly; the server-side
 * genericOAuth plugin serves /sign-in/oauth2 and returns the IdP redirect URL.
 */
export async function signInWithWitus(callbackURL: string): Promise<void> {
  const { data, error } = await authClient.$fetch<{ url: string; redirect: boolean }>("/sign-in/oauth2", {
    method: "POST",
    body: { providerId: "witus", callbackURL },
  });
  if (error || !data?.url) throw new Error("sso_start_failed");
  window.location.href = data.url;
}
