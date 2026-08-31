import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Browser client. baseURL defaults to the current origin, correct for both
// local dev (:3050) and production (vogoat.witus.online).
export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});

/**
 * Starts the "Sign in with WitUS" OAuth flow. In better-auth 1.7 the genericOAuth plugin
 * registers providers as first-class social providers ("no plugin-specific endpoints"), so
 * the core /sign-in/social endpoint is called with the provider id; it returns the IdP
 * authorize URL to navigate to.
 */
export async function signInWithWitus(callbackURL: string): Promise<void> {
  const { data, error } = await authClient.$fetch<{ url: string; redirect: boolean }>("/sign-in/social", {
    method: "POST",
    body: { provider: "witus", callbackURL },
  });
  if (error || !data?.url) throw new Error("sso_start_failed");
  window.location.href = data.url;
}
