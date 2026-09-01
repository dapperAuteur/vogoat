# VO GOAT (repo: vogoat)

**The daily voiceover game.** Stylized VO GOAT in all user-facing surfaces (BAM, 2026-09-01);
code, package, and repo stay `vogoat`. One shared voice recipe a day: everyone gets the same recipe,
the same mundane micro-script, the same cartoon creature. Record your take (audio only), submit
your best, collect the creature, share the card. VO = voiceover. GOAT = greatest of all time.
The mascot is a goat.

- **Status:** phase 1 of 10 (scaffold) on the way to v1; see [`ROADMAP.md`](ROADMAP.md).
- **PRD (read first):** [`docs/01-prd.md`](docs/01-prd.md), decisions locked 2026-08-30.
- **Design:** [`docs/02-design-directions.md`](docs/02-design-directions.md); direction B
  "Field Guide" chosen 2026-08-31. Tokens live in `src/app/globals.css` behind
  `<html data-direction>` so other directions can be A/B tested later.
- **Seed data:** [`data/voice-recipes.csv`](data/voice-recipes.csv) (all 11,664 voice recipes),
  [`data/literary-devices.csv`](data/literary-devices.csv) (251 devices for the admin Workshop).
- **Domain:** `vogoat.witus.online`, a WitUS ecosystem product; sign-in via
  `accounts.witus.online`.

The voice-parameter method adapts Rudolf Laban's effort taxonomy as popularized for voice work
by Darren McStay (Improve Your Voice); VoGoat's scripts and materials are original.

## Local development

Zero setup: with no `DATABASE_URL`, the app runs on an embedded Postgres (PGlite) stored in
`./.data/pglite` and applies its own migrations on first use.

```
pnpm install
cp .env.example .env.local   # optional; everything has a dev default
pnpm dev                     # http://localhost:3050
```

| Script | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js on port 3050 |
| `pnpm check` | typecheck + lint + unit tests |
| `pnpm test` | Vitest: recipe id mapping against the CSV, schema invariants on an in-memory Postgres |
| `pnpm db:generate` | Drizzle migration from `src/db/schema/*` into `src/db/migrations/` |
| `pnpm db:seed` | Idempotent seed: 251 literary devices + script batch 01 as `candidate` (safe on Neon) |
| `pnpm db:seed:dev` | Local only: marks candidates `backlog` on the embedded database so dailies can be assembled before triage; refuses to run against Neon |
| `pnpm db:migrate` | Apply migrations to the Neon URL in `.env.local` (PGlite migrates itself) |
| `pnpm db:migrate:prod:file` / `pnpm db:migrate:prod` | Same against `.env.prod` (node parses the file) / against the shell's `DATABASE_URL` |

`GET /api/health` reports `{ ok, data: { db: "pglite" | "neon" } }`.

**Menagerie:** `/menagerie` (signed in) shows every plate you have performed, silhouettes for missed days, current and best runs, and Goat milestones at 7/30/100; free-plan audio expires at 30 days via a daily cron but plates and runs are forever.

**Sharing:** after submitting, copy the spoiler-free text card or mint an unguessable, revocable audio link; `/s/[slug]` (noindex) plays the take with the script as its transcript, keeps the card alive after audio expiry, and carries a report form on every page.

**Admin:** the `ADMIN_EMAIL` account sees an Admin link in the header to the console hub: `/admin/dailies` (runway, extend the queue, approve/reroll/swap; the daily cron emails when approved days drop below 7), `/admin/scripts` is the §8 triage ritual in-app and `/admin/creatures` vets the placeholder animal art (use / backlog / never; animals stay live unless marked never so the daily cannot go dark), 404 for everyone else.

**Sign-in:** production is Sign in with WitUS only (`accounts.witus.online`); the button
appears once `WITUS_OIDC_CLIENT_ID` is set. In development, `/sign-in` also offers a magic
link whose URL prints to the dev server console (development never sends real email, even
with Mailgun configured). The account matching `ADMIN_EMAIL` becomes admin at first sign-in.

Environment variables are documented in [`.env.example`](.env.example). Deploy, Neon, the
WitUS OIDC client, Blob, Stripe, Mailgun, Turnstile and PostHog are operator steps in
`plans/user-tasks/01-provision-infrastructure.md` (local, gitignored queue).

## Contributing / working in this repo

Process rules live in [`CLAUDE.md`](CLAUDE.md) (identity, invariants, and the shared WitUS
rules block). Branch hygiene: work happens on `feat/…` branches, BAM merges to `main`.
Activate the guard hook once per clone:

```
git config core.hooksPath .githooks
```
