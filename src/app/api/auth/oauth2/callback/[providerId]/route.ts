import { NextResponse, type NextRequest } from "next/server";

/**
 * Compatibility shim: the WitUS IdP registers this app's OAuth redirect URI as
 * /api/auth/oauth2/callback/witus (the ecosystem-wide better-auth 1.6 path, exact-match
 * validated), while better-auth 1.7's genericOAuth handles callbacks at the core
 * /api/auth/callback/:id. The IdP sends the browser here; this forwards code/state intact.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/auth/oauth2/callback/[providerId]">) {
  const { providerId } = await ctx.params;
  const url = new URL(`/api/auth/callback/${encodeURIComponent(providerId)}`, request.url);
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url, 307);
}
