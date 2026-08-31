import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { magicLink } from "better-auth/plugins/magic-link";
import { getDb } from "@/db/client";
import { isAdminEmail } from "./admin";
import { env, hasDevMagicLink, hasWitusSso } from "./env";
import { sendEmail } from "./mailer";

/**
 * Auth is SSO-only in production: VoGoat is a consumer front door for accounts.witus.online
 * (PRD §3) with no local password store. Until the OIDC client is provisioned (witus task 80),
 * development offers a magic link whose email is logged to the console by the mailer fallback;
 * the plugin is never registered in production.
 *
 * Built lazily because the database handle is async (embedded PGlite applies migrations on
 * first use in development).
 */
async function createAuth() {
  const db = await getDb();
  return betterAuth({
    appName: "VoGoat",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg" }),
    user: {
      additionalFields: {
        // input: false → clients can never set their own plan or role.
        plan: { type: "string", required: false, defaultValue: "free", input: false },
        role: { type: "string", required: false, defaultValue: "player", input: false },
      },
    },
    plugins: [
      ...(hasDevMagicLink
        ? [
            magicLink({
              sendMagicLink: async ({ email, url }) => {
                await sendEmail({
                  to: email,
                  subject: "Your VoGoat sign-in link (development)",
                  text: `Sign in to VoGoat:\n${url}\n\nThis link expires in 10 minutes.`,
                });
              },
            }),
          ]
        : []),
      // "Sign in with WitUS": the ecosystem IdP as an OIDC provider. Registered only once the
      // client id exists, so missing env never breaks the build or the dev flow.
      ...(hasWitusSso
        ? [
            genericOAuth({
              config: [
                {
                  providerId: "witus",
                  discoveryUrl:
                    env.WITUS_OIDC_DISCOVERY_URL ??
                    "https://accounts.witus.online/api/idp/.well-known/openid-configuration",
                  clientId: env.WITUS_OIDC_CLIENT_ID as string,
                  clientSecret: env.WITUS_OIDC_CLIENT_SECRET ?? "",
                  scopes: ["openid", "email", "profile"],
                  pkce: true,
                },
              ],
            }),
          ]
        : []),
      nextCookies(),
    ],
    databaseHooks: {
      user: {
        create: {
          // Admin bootstrap at first sign-in, for both magic-link and SSO accounts.
          before: async (user) => ({
            data: { ...user, role: isAdminEmail(user.email, env.ADMIN_EMAIL) ? "admin" : "player" },
          }),
        },
      },
    },
  });
}

let authPromise: ReturnType<typeof createAuth> | undefined;

export function getAuth(): ReturnType<typeof createAuth> {
  authPromise ??= createAuth();
  return authPromise;
}

export type Auth = Awaited<ReturnType<typeof getAuth>>;
export type Session = Auth["$Infer"]["Session"];
