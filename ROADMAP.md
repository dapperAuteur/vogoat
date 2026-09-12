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
| 10 | Launch pass: Turnstile, rate limits, PostHog measures, policy + method pages, a11y sweep | Mostly done: rate limits, PostHog on the ecosystem standard (collects once the key reaches a production build, operator task 14), `/voice-data`, `/about` with the method video, OG + favicon, robots + sitemap. **Remaining: Turnstile keys are not set.** The Playwright + axe sweep now runs (16 specs, zero serious violations); two known issues are filed in `plans/bugs/` |

## Shipped after the original plan (BAM requests, 2026-09-01 to 09-10)

| Change | Status |
|---|---|
| Graceful failures: branded 500 screens with a reference, plus `/admin/errors` | Done (it diagnosed its own first production outage) |
| Cash App QR lifetime claims with hand verification at `/admin/cashapp` | Done; needs one real claim to exercise |
| Admin unlimited attempts + replace-resubmission (the 1/day schema invariant intact) | Done |
| Public archive: `/archive` and `/day/<date>`, indexable, script shown, per-day OG image | Done |
| Collection renamed Menagerie to **Guild** (`/menagerie` 308s to `/guild`) | Done |
| SEO/meta polish (canonical, OG/Twitter, JSON-LD) and Stripe promotion codes at checkout | Done |
| Ecosystem SSO: Continue as a known name, global sign-out, `/goodbye` come-back page | Done |
| Sticky header with the menu, the founder price banner, and the voice-promise banner | Done |
| Buy a lifetime seat with no account; the next sign-in with that email claims it | Done |
| Annual hidden until 100 founders; monthly clickable for signed-out and free accounts | Done |
| Saving practice takes (playback, download, delete) | Done |
| Stripe webhook ignores sibling products' checkouts (the Stripe account is shared) | Done |
| How-to guides with a video slot per feature (`/how-to`) | Done; BAM pastes YouTube ids into `src/lib/how-to/guides.ts` |
| Admin usage analytics (`/admin/analytics`): funnel, habit, used vs avoided | Done |
| Opt-in marketing campaigns with one-click unsubscribe (`/admin/campaigns`) | Done; needs Mailgun live to actually send |
| Billing health (`/admin/billing`) | Done |
| Playwright critical-flow specs and an axe sweep (`pnpm test:e2e`) | Done; caught and fixed a footer contrast failure |
| Every recording deleted after 30 days on every plan (was free only), practice takes included | Done 2026-09-10 |
| Audio playback and downloads fixed (storage reads declare private access); storage failures now logged | Done 2026-09-10 |
| Downloads: free plans within 24 hours of recording, paid plans and admin any time; admin gets the paid perks | Done 2026-09-10 |
| Analytics on the ecosystem PostHog standard: no cookies, no autocapture or recording, app-tagged typed funnel events, plus profile-free server counts for sign-in, sign-up, checkout, purchase, and downloads | Code done 2026-09-12; **collects nothing until the key is on the project and the app is rebuilt** (operator task 14) |
| Takes saved and downloaded as MP3: converted on the device at Keep (daily and practice), original recording as the fallback | Code done 2026-09-12; existing webm/m4a takes keep their format until the 30-day deletion |

## Backlog (not v1)

- Users download all their attempts in one place (`plans/future/05`); per-take download already works (free plans within 24 hours, paid any time).
- One Stripe webhook for the whole ecosystem, or per-app endpoints with the app stamp (`plans/future/07`).
- A/B/C test of the three design directions once there is traffic (`plans/future/01`).
- Blog posts about this build for bam-landing-page (`plans/future/00`).
- Real creature art replacing the placeholder SVG set (the `layers` contract is stable).
- Everything in PRD section 16, plus the McStay outreach (after BAM has tested it himself).
