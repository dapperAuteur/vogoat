import { z } from "zod";

/**
 * Runtime environment, validated once. `next build` runs with NODE_ENV=production but is
 * not a live runtime, so placeholders are allowed during the build phase (and in dev/test)
 * and a build or CI typecheck never needs real secrets.
 */
const isProd = process.env.NODE_ENV === "production";
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const allowDevDefaults = !isProd || isBuildPhase;

/** `.env.example` ships empty strings; treat those as unset. */
function blank(value: string | undefined): string | undefined {
  return value && value.trim() !== "" ? value : undefined;
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3050"),
  // Unset in development = embedded PGlite Postgres under ./.data/pglite (zero setup).
  DATABASE_URL: z.url().optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  // Invariant 7: admin is bootstrapped from this address at first sign-in, never hardcoded.
  ADMIN_EMAIL: z.email().optional(),
  WITUS_OIDC_CLIENT_ID: z.string().optional(),
  WITUS_OIDC_CLIENT_SECRET: z.string().optional(),
  WITUS_OIDC_DISCOVERY_URL: z.url().optional(),
  // The "VoGoat day" flips at 00:00 in this IANA zone for everyone (BAM, 2026-08-31: UTC).
  DAILY_TIMEZONE: z.string().default("UTC"),
  // Day 1 of the public numbering. Fallback value until launch is dated.
  LAUNCH_DATE: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default("2026-09-01"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  // Email: Mailgun (BAM, 2026-08-31: Mailgun, not Resend). Missing = dev-log fallback.
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  MAILGUN_REGION: z.enum(["us", "eu"]).default("us"),
  MAIL_FROM: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.url().optional(),
});

const devPlaceholders = {
  BETTER_AUTH_SECRET: "dev-secret-minimum-32-characters-xxxxxxxxxxxx",
  BETTER_AUTH_URL: "http://localhost:3050",
} as const;

const input = {
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: blank(process.env.APP_URL),
  DATABASE_URL:
    blank(process.env.DATABASE_URL) ??
    blank(process.env.STORAGE_DATABASE_URL) ??
    blank(process.env.STORAGE_POSTGRES_URL),
  BETTER_AUTH_SECRET:
    blank(process.env.BETTER_AUTH_SECRET) ?? (allowDevDefaults ? devPlaceholders.BETTER_AUTH_SECRET : undefined),
  BETTER_AUTH_URL:
    blank(process.env.BETTER_AUTH_URL) ??
    blank(process.env.APP_URL) ??
    (allowDevDefaults ? devPlaceholders.BETTER_AUTH_URL : undefined),
  ADMIN_EMAIL: blank(process.env.ADMIN_EMAIL),
  WITUS_OIDC_CLIENT_ID: blank(process.env.WITUS_OIDC_CLIENT_ID),
  WITUS_OIDC_CLIENT_SECRET: blank(process.env.WITUS_OIDC_CLIENT_SECRET),
  WITUS_OIDC_DISCOVERY_URL: blank(process.env.WITUS_OIDC_DISCOVERY_URL),
  DAILY_TIMEZONE: blank(process.env.DAILY_TIMEZONE),
  LAUNCH_DATE: blank(process.env.LAUNCH_DATE),
  BLOB_READ_WRITE_TOKEN: blank(process.env.BLOB_READ_WRITE_TOKEN),
  CRON_SECRET: blank(process.env.CRON_SECRET),
  MAILGUN_API_KEY: blank(process.env.MAILGUN_API_KEY),
  MAILGUN_DOMAIN: blank(process.env.MAILGUN_DOMAIN),
  MAILGUN_REGION: blank(process.env.MAILGUN_REGION),
  MAIL_FROM: blank(process.env.MAIL_FROM),
  STRIPE_SECRET_KEY: blank(process.env.STRIPE_SECRET_KEY),
  STRIPE_WEBHOOK_SECRET: blank(process.env.STRIPE_WEBHOOK_SECRET),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: blank(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  TURNSTILE_SECRET_KEY: blank(process.env.TURNSTILE_SECRET_KEY),
  NEXT_PUBLIC_POSTHOG_KEY: blank(process.env.NEXT_PUBLIC_POSTHOG_KEY),
  NEXT_PUBLIC_POSTHOG_HOST: blank(process.env.NEXT_PUBLIC_POSTHOG_HOST),
};

const parsed = schema.safeParse(input);
if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${JSON.stringify(z.flattenError(parsed.error).fieldErrors, null, 2)}`);
}

export const env = parsed.data;

export const isProduction = isProd && !isBuildPhase;
/** A real Postgres is configured; otherwise development falls back to embedded PGlite. */
export const hasDatabaseUrl = Boolean(env.DATABASE_URL);
if (isProduction && !hasDatabaseUrl) {
  throw new Error("DATABASE_URL is required in production (see plans/user-tasks/01-provision-infrastructure.md).");
}
/** True once the WitUS SSO client is provisioned; gates the provider and the button. */
export const hasWitusSso = Boolean(env.WITUS_OIDC_CLIENT_ID);
/** Development-only sign-in when SSO is not provisioned (BAM, 2026-08-31). Never in production. */
export const hasDevMagicLink = !isProd;
export const hasBlobStore = Boolean(env.BLOB_READ_WRITE_TOKEN);
export const hasMailgun = Boolean(env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN);
export const hasPostHog = Boolean(env.NEXT_PUBLIC_POSTHOG_KEY);
/** Payments are live once the Stripe secret exists; the upgrade page degrades until then. */
export const hasStripe = Boolean(env.STRIPE_SECRET_KEY);
