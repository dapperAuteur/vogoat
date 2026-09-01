# VoGoat roadmap

Phases from the v1 build plan (PRD: `docs/01-prd.md`). Status as of 2026-08-31.

| # | Phase | Status |
|---|---|---|
| 1 | App scaffold: Next.js 16, Tailwind v4, Drizzle schema, embedded local Postgres, health route, tests | In progress (schema, client, shell, tests done; deploy waits on provisioning) |
| 2 | Auth: Sign in with WitUS (OIDC), `ADMIN_EMAIL` bootstrap, dev-only console magic link | Code done 2026-08-31 (magic-link flow + admin bootstrap verified end to end); SSO lights up when witus task 80 provisions the client |
| 3 | Daily engine: seeds, date-keyed fetch (00:00 UTC), never-dark fallback, the reveal page | In progress: day logic, sampler, fallback, seeds, and `getTodaysDaily()` done and tested (2026-08-31); reveal page next |
| 4 | Recorder + takes: MediaRecorder, 30s cap, keep/discard, 3/day free, private Blob upload, submit | Done 2026-09-01: server core + in-browser recorder (mic on tap, 30s cap, local review, keep/discard, kept-take list with playback, submit with payoff plate). Needs a manual mic pass on real browsers |
| 5 | Payoff + Menagerie: plate fills in, streaks, silhouettes for missed days, 30-day expiry cron | Done 2026-09-01: /menagerie (stats, goat milestones, silhouettes), computed streaks, expiry cron (needs CRON_SECRET, task 05) |
| 6 | Share: spoiler-free text card, plate image, unguessable audio page (noindex, revoke, report) | Done 2026-09-01: copy-card + revocable audio link on the payoff, /s/[slug] page with transcript, expired-audio state, report form, OG image |
| 7 | Admin console: daily authoring queue, script triage, runway alert | Script triage shipped early at `/admin/scripts` (2026-09-01); authoring queue + runway alert pending |
| 8 | The Workshop (admin-only daily literary device) | Not started |
| 9 | Lifetime tier: Stripe checkout, practice mode, downloads, founder badge | Waits on price (witus task 79) |
| 10 | Launch pass: Turnstile, rate limits, PostHog measures, policy + method pages, a11y sweep | Not started |

Backlog (not v1): A/B/C test of the three design directions once there is traffic
(`plans/future/01-ab-test-ui-directions.md`); everything in PRD §16.
