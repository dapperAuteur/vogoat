import { NextResponse, type NextRequest } from "next/server";
import { silentSsoRecoveryPath } from "@/lib/silent-sso";

/**
 * Compatibility shim: the WitUS IdP registers this app's OAuth redirect URI as
 * /api/auth/oauth2/callback/witus (the ecosystem-wide better-auth 1.6 path, exact-match
 * validated), while better-auth 1.7's genericOAuth handles callbacks at the core
 * /api/auth/callback/:id. The IdP sends the browser here; this forwards code/state intact.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/auth/oauth2/callback/[providerId]">) {
  const { providerId } = await ctx.params;

  // THE SECOND HALF OF THE "Continue as <name>" LOOP GUARD. When the IdP declines without a human
  // (login_required and friends, or access_denied when the visitor cancels), send them quietly back
  // to /sign-in with `?sso=tried` rather than forwarding into better-auth's raw /api/auth/error
  // page. The marker stops the probe from immediately offering the same doomed button again, and it
  // is the half that works in a browser with no usable sessionStorage. Deliberately narrow: a real
  // fault (token exchange, issuer mismatch) still surfaces the way it does today.
  const recovery = silentSsoRecoveryPath(request.nextUrl);
  if (recovery) return NextResponse.redirect(new URL(recovery, request.url), 303);

  const url = new URL(`/api/auth/callback/${encodeURIComponent(providerId)}`, request.url);
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url, 307);
}
