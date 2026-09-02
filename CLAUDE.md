## ⚠️ Ecosystem repo identity (don't confuse these)

This repo — **vogoat** — is **VoGoat** (`vogoat.witus.online`): a **daily shared voiceover
game**. Everyone on Earth gets the same daily voice recipe + micro-script + cartoon creature;
players record audio-only takes, submit one, collect the creature in their Guild (renamed from Menagerie, 2026-09-02), and share
a spoiler-free card. VO = voiceover; GOAT = greatest of all time; the mascot is a goat.

Don't confuse it with the other WitUS apps. In particular it is **not**:
- `ride-wit-us` — that owns audio *curriculum*. VoGoat teaches nothing; voice-training
  curiosity links out.
- `stream-witus` — that owns podcasts. VoGoat hosts no episodes (a best-of compilation show
  would live on Stream, not here).
- `flashlearn-ai` — same daily-streak mechanic, different job: study vs play.
- `witus-learn` — the LMS. If a voice course ever exists it lives there.

Full ecosystem identity + product index: `gemini/witus/CLAUDE.md` and
`gemini/witus/lib/products.ts`.

> **This repo is currently a build brief + data assets, not yet an app.** Read
> [`docs/01-prd.md`](docs/01-prd.md) first — decisions are LOCKED (BAM, 2026-08-30); don't
> re-litigate them. `data/` holds the seed assets (voice recipes, literary devices). `plans/`
> is gitignored (local working notes + the user-tasks queue) — the PRD lives in `docs/` so it
> survives a fresh clone.

## The one job

**Hand you one absurd voice recipe a day, capture your best take, and pay you with a
shareable creature.**

If a feature belongs to another platform's job, it is not built here — add a link instead. See
the Redundancy Test in `gemini/witus/plans/ecosystem/README.md`.

## The load-bearing invariants

1. **One submission per day per account — every tier, including paid and admin.** Money buys
   practice mode, retention, and downloads; it never buys extra entries into the shared daily.
   The 1/day rule lives in the schema (partial unique index), not application code.
2. **Discarded audio never leaves the device.** Recording is local; upload happens only when
   the user keeps a take. Attempt *counts* are server-registered (that's how free's 3/day is
   enforced) — audio is not. Any code path that uploads a discarded take is a defect.
3. **Scripts come only from BAM's approved pool.** Weekly ritual: Claude delivers 20
   candidates, BAM marks each `use`/`backlog`/`never`. Never ship an unapproved script; never
   use Darren McStay's demo lines (his video inspired the method — credit, don't copy).
4. **The cut wheels stay cut.** Accents (v1) and the gender wheel are out; the speech-quirk
   wheel (lisp / hard-of-hearing / R→W) is out **permanently** — see PRD §3.1 for why. Don't
   reintroduce any of them without BAM's explicit override.
5. **No public feed in v1.** Sharing is an unguessable, revocable, `noindex` link. No
   browse-strangers surface.
6. **The creature derives from the recipe, not from ML analysis of the user's audio.**
7. **Admin is `ADMIN_EMAIL` (env), never a hardcoded address.** The Workshop (daily
   literary-device writing) is admin-only for now but gated by role, not by a hardcoded user.
8. **Free-tier audio expires at 30 days; the Guild survives expiry** — expiry nulls the
   blob, never the row. Streaks and creatures are forever.

## Stack (planned — no app code yet)

Next.js App Router on Vercel · Neon Postgres (own instance, never shared) + Drizzle · Better
Auth as OIDC client of `accounts.witus.online` (no local password store) · Vercel Blob
(private) for audio · Stripe (lifetime = one-time Checkout) · Mailgun (BAM switched from Resend, 2026-08-31) sending as
`noreply@vogoat.witus.online` · Turnstile · PostHog + Vercel Analytics.

---

<!-- BEGIN:witus-shared-rules v1 -->
<!-- MANAGED BLOCK — do not edit by hand. Source: gemini/witus/docs/shared-rules.md.
     Update the source, then run `node scripts/sync-claude-rules.mjs` in the witus repo. -->

## ⚠️ Ecosystem identity (shared note — don't confuse repos)

Full ecosystem identity + the canonical product index live in `gemini/witus/CLAUDE.md` and
`gemini/witus/lib/products.ts`. Each repo states *which* product it is in its own hand-owned line
above this managed block; don't infer another app's URLs, routes, IDs, env names, or DB schema —
confirm against that app's own code.

The site **brandanthonymcdonald.com** (BAM's personal portfolio) lives in `claude/bam-landing-page/`
— **NOT** `projects/bam-portfolio/` (the retired legacy static site). Target `bam-landing-page`.

## Operator-task rule — capture user actions in `./plans/user-tasks/`

When Claude proposes work that needs BAM to do something outside the editor (account signup, API
key, DNS change, vendor dashboard, env-var rotation, secret generation, PR review/merge, etc.),
Claude MUST create a `./plans/user-tasks/NN-slug.md` file in this repo. **No exceptions for "small"
steps.** Required sections: **Scope tag** · **What + why** (with explicit *what this blocks* detail
and any hard deadline) · **Steps** · **What Claude will use** · **How to mark done** · **Related**.
Keep `./plans/user-tasks/00-descriptions.md` updated with columns `# | Title | Scope | Blocks |
Status` — the `Blocks` column is the one BAM scans. Ecosystem-wide tasks (Keap, IRL events, retros,
cross-product decisions) live in the canonical witus queue at `gemini/witus/plans/user-tasks/`;
repo-local tasks live here. Read the witus queue at session start before dependent work. Full rule:
`gemini/witus/CLAUDE.md` §"Operator-task rule".

## Branch hygiene — BAM merges, between sessions by default

**Half 1.** Branch → commit → push → stop. Claude does not run `git checkout main && git merge`.
Never `--force` to shared branches. Before every commit run `git branch --show-current`; if it is
`main`/`master`, branch first (`feat/ fix/ chore/ docs/`). After push, hand back the branch name +
summary and stop.

**Half 2.** BAM merges pushed branches via the GitHub UI between sessions. Mid-session, after a
push, BAM may merge in a separate window and the local checkout silently fast-forwards to `main` —
so re-check `git branch --show-current` before **every** commit, not just at branch creation, or you
risk landing follow-up commits directly on `main`.

**Half 3.** Keep branches small (one concern each). When a session produces multiple branches,
consolidate them into one `bundle/<slug>-YYYY-MM-DD` via `git merge --no-ff` (preserves per-concern
history — no squash), resolve conflicts during bundling, run `tsc + lint + build` against the
bundle, push, and file ONE `./plans/user-tasks/NN-merge-bundle-<slug>.md`. BAM does one merge, not N.

**Commit often.** Commit at every working checkpoint — a passing build, a finished sub-step, a green
test — not just at the end. A usage-limit cutoff, a dropped connection, or a crashed session must
never lose more than the last few minutes of work. Small frequent commits on the feature branch keep
the branch un-merged (Half 1 still holds) and give BAM clean per-step history to drill into.

A checked-in `.githooks/pre-commit` guard refuses commits made directly on `main`/`master`. Activate
once per clone: `git config core.hooksPath .githooks`. Full rule: `gemini/witus/CLAUDE.md`
§"Branch-hygiene rule".

## Docs-sync rule — a change isn't done until its docs are current

When a change adds, alters, or removes a user-visible feature/route/scope, update the affected docs
**in the same branch**: README (feature list, env examples, scripts), in-app help/tutorial content,
`ROADMAP.md` **and** any public roadmap page, API/OpenAPI docs, and STYLE_GUIDE/CONTRIBUTING when a
convention changed. State which docs you touched in the handoff. Never leave an aspirational ✅ on a
roadmap — downgrade it with a one-line reason. If a doc update is genuinely out of scope, file it as
a `./plans/` task rather than skipping silently. A Stop hook in `.claude/settings.json` gates on
this: if the session diff changed feature/route files but touched no docs, it blocks once and asks
you to update-or-defer. Schema-only migrations, refactors, perf, and dev-tooling changes don't
trigger it.

## Plans convention

All implementation plans live in `./plans/` as `NN-description-of-plan.md` (two-digit prefix,
kebab-case, next available number, don't skip). Sub-queues: `./plans/user-tasks/NN-slug.md`
(operator tasks), `./plans/bugs/`, `./plans/future/`. (`plans/` is typically gitignored.)

## Citation rule

Anything publishable, teachable, or partner-facing (curriculum, teaching-oriented help articles,
white papers, grant/sponsor/partner writing) uses APA 7 in-line citations with a `## References`
section. Code docs, internal notes, and `plans/user-tasks/*` are out of scope. Full rule:
`gemini/witus/CLAUDE.md` §"Citation rule".

## Authoritative-values rule — never assert guessed external values

When a value is owned by an external system (DNS/registrar, a host like Vercel, a third-party API,
or another ecosystem app's URLs/routes/IDs/env/schema), read it from the authoritative source; don't
hardcode a guessed default and present it as correct. If you must ship a fallback, label it as a
fallback in both UI copy and a code comment. Verify by behavior (does the flow work?), not by
exact-match against a guess. When unsure, flag or ask — never assert. Full rule:
`gemini/witus/CLAUDE.md` §"Authoritative-values rule".

## Coding conventions

UI/UX/DX conventions (a11y, component patterns, TypeScript, microcopy, git-commit vocabulary, the
default Neon+Drizzle+pnpm+Vitest stack) are consolidated in `gemini/witus/docs/shared-ui-ux-dx.md`.
Read it before writing UI or API code. Two repos are grandfathered on Supabase+Jest and documented
there as exceptions.

<!-- END:witus-shared-rules v1 -->
