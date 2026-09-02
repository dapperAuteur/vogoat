# VO GOAT roadmap

Phases from the v1 build plan (PRD: `docs/01-prd.md`). **Status as of 2026-09-02: the game is
live in production** at vogoat.witus.online, the full loop verified end to end by BAM (sign in
with WitUS, record, keep, submit, plate fills, Guild, share).

| # | Phase | Status |
|---|---|---|
| 1 | App scaffold: Next.js 16, Tailwind v4, Drizzle schema, embedded local Postgres, health route, tests | Done, deployed |
| 2 | Auth: Sign in with WitUS (OIDC), `ADMIN_EMAIL` bootstrap, dev-only console magic link | Done, live in production (better-auth 1.7 contract + the registered callback shim) |
| 3 | Daily engine: seeds, date-keyed fetch (00:00 UTC), never-dark fallback, the reveal page | Done, live |
| 4 | Recorder + takes: MediaRecorder, 30s cap, keep/discard, 3/day free, private Blob upload, submit | Done, live (Blob store authenticates via Vercel OIDC). A cross-browser mic pass on iOS Safari is still worth doing |
| 5 | Payoff + Guild: plate fills in, streaks, silhouettes for missed days, 30-day expiry cron | Done: `/guild` (stats, goat milestones, silhouettes, playback of past takes), computed streaks, daily expiry cron |
| 6 | Share: spoiler-free text card, plate image, unguessable audio page (noindex, revoke, report) | Done |
| 7 | Admin console: daily authoring queue, script triage, runway alert | Done: `/admin` hub, dailies, scripts, creatures, workshop, cashapp, errors, roadmap |
| 8 | The Workshop (admin-only daily literary device) | Done: shuffled no-repeat cycle over 251 devices, archive, script-candidate loop-closer |
| 9 | Paid tiers: Stripe checkout (lifetime $103.29 / $100 Cash App QR, monthly $10.60, annual gated at 100 founders), plan sync + lapse policy, practice room, downloads, founder badge | Code done; Stripe keys are set on the project. **Not yet exercised end to end** (test purchase + webhook + a lapse) |
| 10 | Launch pass: Turnstile, rate limits, PostHog measures, policy + method pages, a11y sweep | Mostly done: rate limits, PostHog wired (key set), `/voice-data`, `/about` with the method video, OG + favicon, robots + sitemap. **Remaining: Turnstile keys are not set.** The Playwright + axe sweep now runs (16 specs, zero serious violations); two known issues are filed in `plans/bugs/` |

## Shipped after the original plan (BAM requests, 2026-09-01/02)

| Change | Status |
|---|---|
| Graceful failures: branded 500 screens with a reference, plus `/admin/errors` | Done (it diagnosed its own first production outage) |
| Cash App QR lifetime claims with hand verification at `/admin/cashapp` | Done; needs one real claim to exercise |
| Admin unlimited attempts + replace-resubmission (the 1/day schema invariant intact) | Done |
| Public archive: `/archive` and `/day/<date>`, indexable, script shown, per-day OG image | Done |
| Collection renamed Menagerie to **Guild** (`/menagerie` 308s to `/guild`) | Done |
| SEO/meta polish (canonical, OG/Twitter, JSON-LD) and Stripe promotion codes at checkout | Done |
| Ecosystem SSO: Continue as a known name, global sign-out, `/goodbye` come-back page | Done |

## Backlog (not v1)

- Saving practice-room takes to the server (today the practice recorder is local-only).
- Users download all their attempts in one place, paid-only (`plans/future/05`); per-take download already works.
- One Stripe webhook for the whole ecosystem, or per-app endpoints with the app stamp (`plans/future/07`).
- A/B/C test of the three design directions once there is traffic (`plans/future/01`).
- Blog posts about this build for bam-landing-page (`plans/future/00`).
- Real creature art replacing the placeholder SVG set (the `layers` contract is stable).
- Everything in PRD section 16, plus the McStay outreach (after BAM has tested it himself).
