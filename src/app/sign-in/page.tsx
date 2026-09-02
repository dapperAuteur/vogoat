import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DevMagicLinkForm } from "@/components/auth/dev-magic-link-form";
import { WitusSsoButton } from "@/components/auth/witus-sso-button";
import { hasDevMagicLink, hasWitusSso, witusSilentSsoEndpoint } from "@/lib/env";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl tracking-wide italic">VO GOAT</span>
      </header>
      <section className="flex flex-col gap-4 rounded-md border border-rule bg-card p-5">
        <div>
          <h1 className="font-display text-2xl italic">Sign in</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Keeping takes, streaks, the Guild, and sharing need an account. Spinning and
            rehearsing never do.
          </p>
        </div>
        {hasWitusSso ? <WitusSsoButton silentCheckUrl={witusSilentSsoEndpoint} /> : null}
        {hasDevMagicLink ? <DevMagicLinkForm /> : null}
        {!hasWitusSso && !hasDevMagicLink ? (
          <p className="text-sm leading-relaxed text-muted">
            Sign-in is not available yet: VO GOAT uses Sign in with WitUS and the connection is
            still being set up. Today&apos;s recipe works without an account.
          </p>
        ) : null}
      </section>
      <p className="text-xs leading-relaxed text-muted">
        One WitUS account works across the whole ecosystem. Audio stays on your device until you
        keep a take.
      </p>
    </main>
  );
}
