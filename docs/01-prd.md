# VoGoat — v1 PRD

**Status:** decisions locked by BAM 2026-08-30 · repo scaffolded 2026-08-31 · pre-provisioning ·
**Owner:** BAM · **Admin account:** `bam@awews.com` (via `ADMIN_EMAIL` env) ·
**Last updated:** 2026-09-01

> Tracked in `docs/` rather than `plans/` because `plans/` is gitignored ecosystem-wide and this
> document must survive a fresh clone. Origin: idea + decision pass in
> `gemini/witus/plans/ecosystem/new-app-ideas/vo-goat.md` (2026-08-30, kept as history there).

---

## 1. Context

**VoGoat** = **VO** (voiceover) + **GOAT** (greatest of all time). Mascot: a goat.

The seed idea (BAM, 2026-08-30): a daily voiceover randomizer. One button reveals a voice
recipe, the user records their version of that voice (audio only), the app shows them a cartoon
animal that matches the voice, shareable, limited takes per day per account.

The parameter system comes from Darren McStay's video *"How to Create 100 Distinctly Different
Voices"* (Improve Your Voice, YouTube): Laban efforts × placement × breath × age × gender ×
creature size × tempo × volume × attitude × accent × speech quirks ≈ 699,840 combinations.
Laban's eight efforts (dab, flick, press, thrust/punch, wring, slash, glide, float) are standard
actor-training pedagogy from Rudolf Laban's movement work — public domain as a method. McStay's
*presentation* (his script lines, his PDF, his counting gimmick) is his content and is not
reproduced here. See §14 Attribution.

Wordle proved the shape: one shared daily puzzle, a hard daily limit, a spoiler-free share
artifact. VoGoat is that shape for voice play. The comedy engine is **mundane text × extreme
voice recipe** — everyone reads the same boring sentence as today's Tiny Menacing Elder, and the
results are gloriously different.

## 2. The one job

**Hand you one absurd voice recipe a day, capture your best take, and pay you with a
shareable creature.**

Not a voice course (link out). Not a podcast platform (Stream owns that). Not a social network
(no feed, no follows in v1).

## 3. Decisions locked (BAM, 2026-08-30; Workshop added 2026-08-31)

| Decision | Choice |
|---|---|
| Daily model | **Shared daily** — everyone gets the same recipe + script + creature, seeded by date. The button press is a slot-machine *reveal*, not per-user RNG. |
| Daily unit | One authored row: (recipe, script, creature) curated together, human-vetoed before publish → **§6**. |
| Takes & submissions | **Free: 3 takes + 1 submission per day.** Paid/admin: unlimited takes, still 1 submission (see §5 — one-submission-per-day is universal; paying buys practice, never extra entries). |
| Retention | **Free: audio kept 30 days.** Menagerie creatures, streaks, and share cards persist forever — only the audio expires. Paid/admin: audio kept indefinitely. |
| Recording | **Audio only.** In-browser MediaRecorder, ~30s hard cap. |
| Recording privacy | **Audio never leaves the device unless the user keeps a take.** Attempt *counts* are server-tracked for signed-in users (that's how 3/day is enforced); discarded audio is never uploaded. |
| Anonymous funnel | Anyone can spin + rehearse with no account (all local, nothing counted). **Keep / submit / streak / menagerie / share require Sign in with WitUS.** VoGoat is a consumer front door for `accounts.witus.online`. |
| Sharing | **Pull, not push.** No public feed in v1 (BAM: acceptable). Share = unguessable `noindex` URL, revocable, report button on every shared page. Plus a Wordle-style text/image card that works with no audio. |
| Creature | Derived from the recipe (size → animal class, attitude → expression, age → accessories, effort → pose), rendered from a layered 2D asset library at authoring time. No runtime AI image generation. Goat reserved for milestones. |
| Collection | **The Menagerie** — archive grid of every creature you've performed. Streak + collection are the retention pair. |
| Script | Original micro-scripts, mundane, never McStay's lines. **BAM approves every script** via a weekly 20-script batch ritual → **§8**. |
| The Workshop | **Admin-only daily writing feature** (BAM, 2026-08-31): one randomly-ordered literary device per day, BAM writes a piece using it → **§9**. Gated by role, not hardcoded to a user. |
| Placement | WitUS product, repo **`claude/vogoat`**, **`vogoat.witus.online`** (vogoat.com is taken — subdomain only, no purchase), OIDC client of `accounts.witus.online`. |
| Age | **13+.** |
| Moderation | BAM alone in v1. Only shared clips are reportable. |
| Accounts | Four tiers: **free · lifetime · subscription · admin** → **§5**. Lifetime *purchase* confirmed as the intent (ecosystem lifetime-push motif). Admin = `bam@awews.com` via `ADMIN_EMAIL` env. |
| McStay outreach | **After build, after BAM has tested it himself.** Show, don't pitch. |

### 3.1 Judgement calls that stand (flagged in the proposal, not overridden)

Kept as a record of *why*; reversible by BAM saying so, but the decision pass left them intact:

1. **Accent wheel (10 accents) cut from v1.** Randomly assigning "do an Indian accent" / "do a
   Nigerian accent" and encouraging public sharing is a mockery-adjacent brand risk; the recipe
   space is 11,664 without it. Possible phase-2: *opt-in* accent slot where the user chooses an
   accent they own or love.
2. **Speech-quirk wheel (lisp / hard-of-hearing / R→W) cut permanently.** In pro VO training
   these are character tools; in a random public game, "do a lisp today, share it" is an
   instruction to mock a speech impediment. Not a phase-2 item.
3. **Gender wheel cut; size carries pitch.** McStay's own demo maps small→high, large→low; a
   "do your version of a woman" wheel adds acoustic near-duplication plus a sharing minefield.
4. **The creature matches the *recipe*, not ML analysis of the user's audio.**
   Performance-reactive creatures are a phase-2 candidate.

## 4. The recipe space (v1 wheels)

| Wheel | Values | Count |
|---|---|---|
| Laban effort | dab · flick · press · punch · wring · slash · glide · float | 8 |
| Placement | nasal · throaty · balanced | 3 |
| Air | breathy · dry | 2 |
| Age | kid-ish · adult · elder | 3 |
| Creature size | tiny · medium · huge *(drives the animal; carries pitch)* | 3 |
| Tempo | slow · steady · rapid | 3 |
| Volume | hushed · medium · big | 3 |
| Attitude | friendly · deadpan · menacing | 3 |

**8 × 3 × 2 × 3 × 3 × 3 × 3 × 3 = 11,664 recipes** — 31 years of dailies. Full enumeration:
[`data/voice-recipes.csv`](../data/voice-recipes.csv) (11,664 rows, efforts decomposed into
weight/space/time). Each wheel value ships with a one-line plain-English coaching hint
(e.g., *float: light, sustained, indirect — the voice drifts and doesn't quite land*), because a
newcomer has never heard the word "Laban."

Cut from McStay's full system: accents, speech quirks, gender (§3.1). "Aggressive" renamed
**menacing** — funnier, less hostile, same acoustic target.

## 5. Accounts and tiers

Locked tier list (BAM): **free · lifetime · subscription · admin**. One rule is universal and
carries the game's integrity: **every tier gets exactly 1 submission per day.** Money buys
practice, storage, and tools — never extra entries into the shared daily. The submitted take's
number goes on the share card ("take 1/3" is the flex).

| | Daily takes | Submissions/day | Audio retention | Practice mode | Extras |
|---|---|---|---|---|---|
| **Free** | 3 | 1 | 30 days | — | Menagerie + streaks + share cards forever (audio expires, the creature doesn't) |
| **Lifetime** (one-time purchase) | unlimited | 1 | forever | ✓ | Take downloads · founder badge in menagerie |
| **Subscription** (monthly) | unlimited | 1 | while active* | ✓ | Take downloads |
| **Admin** (`ADMIN_EMAIL`) | unlimited | 1 | forever | ✓ | Authoring console: dailies, script triage, creatures, reports, runway alerts · **The Workshop (§9)** |

**Practice mode** (paid): spin *any* of the 11,664 recipes on demand, record freely, nothing
counts against the daily. This is the VO-actor tool — the thing worth paying for — and it moved
from phase-2 into the paid tier because a lifetime purchase at launch must buy something real
at launch.

*\*Proposed lapse policy (BAM to confirm): subscription lapses → account drops to free rules
going forward; already-stored audio gets a 30-day clock from lapse, then expires like free.
Menagerie survives regardless.*

**Sequencing recommendation (BAM to confirm):** launch with **free + lifetime + admin**;
lifetime is a one-time Stripe checkout with no webhook lifecycle, which fits the spring
lifetime-push motif and defers subscription plumbing until practice mode proves demand.

Expired-audio share links stay live as the card + script + "this take has expired" — the share
never 404s, and it quietly advertises what lifetime buys.

## 6. The daily unit, elaborated

A **daily** is one authored row: `(recipe, script, creature)` for one calendar date, prepared
ahead of time and human-approved. Operationally:

1. **Recipe** — drawn from [`data/voice-recipes.csv`](../data/voice-recipes.csv), excluding
   recipes already used, biased for variety against the recent window (no two menacing-huge
   days back-to-back; the sampler checks the last ~14 days' wheels).
2. **Script** — pulled from the BAM-approved pool only (§8 ritual). Pairing is checked as a
   unit: a script that's harmless alone can turn ugly against a specific recipe (a menacing
   read of a line about a spare key under a flowerpot is a burglary vibe). **Human veto of
   pairings is exactly what pure RNG can't do — this is why the daily is authored.**
3. **Creature** — auto-derived from the recipe (size → base animal, attitude → expression,
   age → accessories, effort → pose), name generated ("The Tiny Menacing Elder Mouse"), art
   composited from the layer library at authoring time. BAM can reroll the base animal within
   the size class if the draw is stale.
4. **Review** — the admin console lists the upcoming batch; BAM swaps scripts, rerolls
   recipes/creatures, vetoes pairings. Approving flips `status: draft → approved`. Only
   `approved` rows ever publish.
5. **Runway rule** — keep **≥14 approved days** queued. Console shows the runway; email (Mailgun)
   to the admin when it drops below 7.
6. **Never-dark fallback** — if a date arrives with no approved row (it shouldn't), the app
   deterministically assembles one from an unused recipe + a backlog script, marks it `auto`,
   and flags it for retroactive review. Streaks must never break because authoring fell behind.

## 7. Core loop

1. **Land** — today's card back: "VoGoat #214", streak, big button. No account needed yet.
2. **Spin** — slot-machine reveal: eight wheels settle one by one, creature appears as a
   silhouette, script fades in. (Deterministic by date; theater, not RNG.)
3. **Take** — record (30s cap), instant playback, then **keep or discard**. Discarded audio
   never uploads. Kept takes upload to the account. Free accounts get 3 takes on the daily;
   the counter is server-tracked and the UI shows it plainly ("take 2 of 3").
4. **Submit** — pick one kept take as the official entry → Sign in with WitUS if not signed
   in. One submission per day, enforced in the schema, said in the UI before the button.
5. **Payoff** — creature card flips to full color with the submitted take attached. Menagerie
   updated, streak incremented.
6. **Share** — (a) spoiler-free text/image card: `VoGoat #214 🐁 tiny · menacing · elder ·
   hushed · float — take 2/3 — [link]`; (b) optional audio share link (unguessable slug,
   noindex, revocable, reportable).
7. **Tomorrow** — new row.

Missed days break the streak but not the collection: the menagerie shows silhouettes for missed
days (completionist itch), and back-filling is not allowed — the day is the point.

## 8. Scripts — the weekly ritual (BAM's rule, formalized)

**Every week Claude delivers 20 candidate scripts. BAM triages each one: `use` (approved pool),
`backlog` (usable later), or `never` (marked so it's not re-pitched).** Only `use`/`backlog`
scripts can be paired into dailies. Math: 20/week at even a 50% approval rate outruns the 7
dailies/week burn and builds buffer. Batch 01 (delivered 2026-08-30, awaiting triage):
`gemini/witus/plans/ecosystem/new-app-ideas/vo-goat-scripts-batch-01.md`. The ritual goes live
properly with the admin console; until then, batches are markdown files BAM marks up.

Script requirements (every candidate, before it's ever pitched):
- **1–2 sentences, ≤ ~8 seconds at steady tempo** — must survive `rapid` without gasping and
  `slow` without dying.
- **Deliberately mundane.** "Please remember to defrost the chicken before Thursday." The
  comedy is the collision between boring text and extreme recipe.
- **Safe in every attitude** — written to be harmless even in a menacing read: no lines about
  people, groups, threats, or anything break-in/stalker-adjacent when read darkly.
- **No real people, brands, or place-name minefields. No tongue-twisters** — the challenge is
  the voice, not diction.
- **Original writing only.** Never McStay's demo lines.
- The script text doubles as the caption on every shared page — transcript accessibility free.

## 9. The Workshop — admin-only daily writing (added 2026-08-31)

BAM's ask (idea file + `witus-learn/plans/future-courses/2026-08-30-literary-devices.md`):
*"a feature for me only at the moment that has me write something using a different literary
device each day, chosen randomly"* — explicitly paired with the VoGoat daily.

- **One literary device per day**, drawn from the 251 devices in
  [`data/literary-devices.csv`](../data/literary-devices.csv) (device list per
  literary-devices.com — BAM's pointed source; definitions and examples are original). Devices
  are assigned by shuffled cycle: **no repeats until all 251 are used** (~8 months), then
  reshuffle. The assignment is recorded per date, same shared-daily philosophy.
- **The Workshop page shows:** the device (name + definition + 3 examples), and — this is the
  pairing — **today's voice recipe and script as optional creative constraints.** Write a
  paragraph of dialogue for the Tiny Menacing Elder using anaphora, if the collision inspires;
  ignore it if not.
- **BAM writes, the entry saves** (admin retention: forever). Own streak, own archive, private.
  Nothing publishes anywhere.
- **The loop-closer:** an entry can be flagged **`script candidate`** — it lands in the weekly
  script-triage queue (§8). BAM's daily writing practice becomes tomorrow's VoGoat content.
- **Admin-only "at the moment"** (BAM's phrasing): gate by `role = admin`, never by a
  hardcoded user id, so opening it to paid tiers later ("Writers' Workshop") is a flag flip
  plus a pricing decision, not a migration.

## 10. Ecosystem redundancy check

Per the Redundancy Test in `gemini/witus/plans/ecosystem/README.md`:

| Adjacent platform | Owns | Why VoGoat is not it |
|---|---|---|
| RideWitUS | Bike-mechanic audio curriculum | VoGoat teaches nothing; it's a daily toy. Voice-training curiosity links out (McStay, or a future Learn.WitUS course). |
| Stream.WitUS | Podcasts + media tracking | VoGoat hosts no episodes. Phase-2 candidate: a "best of VoGoat" compilation show *on Stream*, not here. |
| FlashLearnAI | Daily spaced-repetition study | Same daily-streak mechanic, different job: study vs play. |
| Learn.WitUS | Multi-tenant LMS | If a voice course ever exists, it lives there and VoGoat links to it. The Workshop is BAM's private practice, not a course — if it ever grows lessons, that's Learn's job. |
| Create.WitUS | Collaboration calls | No matching, no messaging, no profiles beyond the menagerie. |

If VoGoat ever grows lessons, a feed, or DMs, it has left its one job.

## 11. The design rules that carry the safety model

**Rule 1 — Discarded audio never leaves the device.** Recording happens locally; upload occurs
only when the user keeps a take. Attempt counts (not audio) are registered server-side for
signed-in users to enforce the 3/day limit. Any code path that uploads a discarded or
in-progress take is a defect. Stated in the UI in one sentence.

**Rule 2 — No public feed in v1** (BAM: acceptable). Sharing is a link the owner hands out. No
browse-strangers surface exists, so the moderation surface is only clips whose owners chose to
publish a link. A "today's takes" gallery is phase 2 and requires a moderation answer first.

**Voice-data policy, plain language:** no voice-print analysis, no biometric identification,
user audio is never AI-training data, deletion deletes the blob, free-tier audio expires at 30
days and expiry deletes the blob too. Say this loudly; it's a differentiator in 2026.

Other guardrails: 30s/~2MB cap per take · report button on every shared page → BAM triage ·
Turnstile on anonymous-adjacent surfaces · rate limits on take registration, submission, and
share creation · `noindex` on all share pages · takes and shares owner-deletable from day one.

## 12. Data model

Neon Postgres (own instance, never shared) + Drizzle ORM.

**Auth** — `user` · `session` · `account` · `verification` (Better Auth standard; identity from
`accounts.witus.online`, no local password store). `user` gains `plan`
(`free|lifetime|subscriber`) and `role` (`player|admin`). Admin is bootstrapped by env
`ADMIN_EMAIL` at first SSO sign-in — no hardcoded email in code.

**`script`** — `id` · `body` · `status` (`candidate|use|backlog|never`) · `batch` (int) ·
`decided_at` · `notes` · `used_on` (date, nullable)

**`creature`** — `id` · `name` · `base_animal` · `layers` (jsonb) · `image_url` (rendered at
authoring time)

**`daily`** — the authored unit.
`id` · `day_date` (**unique**) · `recipe` (jsonb, the 8 wheel values) · `script_id` ·
`creature_id` · `status` (`draft|approved|published|auto`) · `notes` · `created_at`

**`take`** — one row per attempt, registered at record-start for signed-in users.
`id` · `user_id` · `daily_id` · `take_number` · `status` (`recorded|kept|submitted|discarded`) ·
`blob_url` (nullable until kept) · `duration_ms` · `mime` · `expires_at` (nullable — set to
`created_at + 30 days` for free plan, cleared on upgrade) · `created_at` · `deleted_at`
— **unique (`user_id`, `daily_id`, `take_number`)** caps attempts; **partial unique index on
(`user_id`, `daily_id`) where `status = 'submitted'`** puts the 1-submission rule in the
schema, not application code.

**`practice_take`** — paid tiers only. `id` · `user_id` · `recipe` (jsonb) · `blob_url` ·
`duration_ms` · `created_at` · `deleted_at`. Never joins the daily game.

**`purchase`** — `id` · `user_id` · `kind` (`lifetime`) · `stripe_checkout_id` · `amount` ·
`created_at`. (Subscription state, if/when it ships, syncs `user.plan` via Stripe webhooks.)

**`share`** — `id` · `take_id` (**unique**) · `slug` (unguessable) · `revoked_at` · `created_at`

**`report`** — `id` · `share_id` · `reason` · `detail` · `status` (`open|actioned|dismissed`) ·
`handled_by` · `handled_at` · `created_at`

**`literary_device`** — seeded from `data/literary-devices.csv`.
`id` · `name` (unique) · `definition` · `example_1` · `example_2` · `example_3`

**`workshop_daily`** — the no-repeat cycle assignment.
`id` · `day_date` (**unique**) · `device_id` · `cycle` (int) · **unique (`device_id`, `cycle`)**

**`workshop_entry`** — `id` · `user_id` · `day_date` · `device_id` · `body` ·
`is_script_candidate` (bool) · `created_at` · `updated_at` · **unique (`user_id`, `day_date`)**

Streaks computed from submitted `take` rows. The menagerie is a join (`take ⨝ daily ⨝
creature`) and **survives audio expiry** — expiry nulls the blob, never the row.

A Vercel cron job deletes expired free-tier blobs daily and nulls `blob_url`.

## 13. Stack

Ecosystem standard: Next.js App Router on Vercel · Neon + Drizzle · Better Auth as OIDC client
of `accounts.witus.online` · **Vercel Blob (private)** for audio with tokenized playback URLs ·
**Stripe** (own account/keys per ecosystem pattern; lifetime = one-time Checkout) · Mailgun (BAM, 2026-08-31; was Resend) from
`noreply@vogoat.witus.online` · Turnstile · PostHog + Vercel Analytics.

Recording notes: MediaRecorder yields `audio/webm` (Opus) on Chrome/Firefox and `audio/mp4`
(AAC) on Safari — store as recorded, play via `<audio>`, normalize later only if compilation
features need it. Storage math: ~1MB/take, free audio expires at 30 days, so free-tier storage
is bounded at ~(daily kept takes × 30) MB steady-state; only paid archives grow unbounded, and
they're paid for.

## 14. Attribution and outreach

- **About-the-method page** credits Rudolf Laban (the effort taxonomy) and names Darren
  McStay's video as the inspiration, with a link to his channel/course. Method: not
  protectable. His script lines and materials: his — never shipped.
- **Outreach: after build, after BAM has personally tested it** (locked 2026-08-30). Show,
  don't pitch — a live, polished daily game with his credit already on the method page is the
  strongest possible opener for an affiliate/mention-swap conversation. Captured in witus
  user-task 79; no legal dependency either way.

## 15. Success measures

| Measure | Why |
|---|---|
| Spin → submitted take conversion (signed-in) | The core funnel. If people spin and don't record, the ask is too scary or the payoff too weak. |
| D7 return + median streak length | Whether the daily habit forms. Dies first if the loop isn't fun. |
| Shares per submitted take; share-link visits → new spins | The viral loop, measured end to end. |
| New WitUS accounts created via VoGoat | The SSO-funnel payoff, measurable at the IdP. |
| Lifetime purchases per 100 D7-retained users | Whether practice mode + archive is worth money to the people who stayed. |
| Reports per 100 shared clips | Safety load. |

Explicitly **not** success measures: total signups, raw page views, session length. A daily toy
with long sessions is malfunctioning.

### Kill criteria (provisional thresholds — BAM sets the real ones)

90 days after launch: if fewer than ~20% of signed-in spins end in a submitted take, or D7
return is under ~10%, the loop isn't fun. The fix is the payoff (creature, share card, reveal),
never more wheels or more features.

## 16. Phase 2 and beyond — not being built

Public "today's takes" gallery (needs a moderation answer first) · performance-reactive
creatures (audio ML) · opt-in accent slot · best-of compilation show on Stream.WitUS ·
subscription tier if deferred at launch (see §5) · Workshop opened to paid tiers ("Writers'
Workshop") · sponsor-a-day · McStay affiliate/partnership (after the post-build outreach).

## 17. Remaining open items (none block the build)

> **2026-09-01 update (BAM):** items 1–3 answered. Prices: lifetime **$103.29** (or **$100.00**
> via Cash App Pay), monthly **$10.60**, annual **$103.29** offered only after 100 lifetime
> founders (the $100 path is a Cash App QR with hand verification in /admin/cashapp).
> Sequencing: monthly subscription ships at launch alongside free + lifetime + admin.
> Admin addendum: admin gets unlimited attempts and REPLACE-resubmission (a new submit demotes
> the previous one to kept); the one-submitted-row-per-day schema invariant is untouched.
> Lapse policy: as proposed (lapse → 30-day clock on stored audio; Menagerie survives).

1. **Lifetime price** (and subscription price, if it ships at launch). Operator decision,
   captured in witus user-task 79.
2. **Sequencing** — confirm the §5 recommendation: launch free + lifetime + admin, defer
   subscription.
3. **Lapse policy** — confirm the §5 proposal (lapse → 30-day clock on stored audio).
4. **Take-number on the share card** — proposed as the Wordle-grid equivalent ("take 2/3");
   confirm it stays for unlimited-take tiers ("take 7" is its own confession).
5. **Script batch 01 triage** — 20 candidates awaiting `use`/`backlog`/`never` marks.
