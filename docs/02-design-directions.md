# 02 — Design directions for VoGoat v1 (UI / UX / DX)

**Status:** three candidate directions awaiting BAM's pick (2026-08-31). Nothing here re-opens a
locked PRD decision; every direction realizes the same core loop (PRD §7) and the same invariants
(CLAUDE.md). What differs is the visual identity, which retention and sharing levers are put in
front, how the app handles the "I hate my recorded voice" moment, and the developer-experience
variant that best serves that identity. Visual mockups: the "VoGoat Design" canvas (link in the
session handoff). Once a direction is chosen this file is superseded by `docs/03-design-system.md`.

---

## 1. What the research says (and what VoGoat does about it)

| # | Finding | Source | VoGoat implication |
|---|---|---|---|
| 1 | Wordle's growth came from scarcity (one puzzle, same for everyone, no endless play, no notifications) and from a share artifact that tells the story of the attempt without spoiling it. The emoji grid was invented by players and adopted by the game. | Wardle (Slate, 2022; TechCrunch, 2022; GDC 2022 via Axios / BeyondGames) | Already locked in the PRD (shared daily, 1 submission). The share card must carry a *story*: the take number ("take 2/3") is VoGoat's equivalent of the guess grid. Watch what players paste in chats and adopt their format if it beats ours. |
| 2 | Intact streaks shown in a log increase follow-on behavior; broken streaks shown in a log *reduce* it, more so when the person blames themselves. The effect weakens when a repair is possible. | Silverman & Barasch (2023), *JCR* | The PRD forbids back-filling (locked), so a broken streak cannot be repaired. Design consequence: never make the broken streak the loudest number. Show current streak *and* best streak, and make the never-breaking Menagerie the primary progress display. |
| 3 | Duolingo's streak is its strongest retention lever; a streak freeze cut churn 21% for at-risk users. Loss aversion kicks in around day 7. | Apptitude (n.d.); Just Another PM (n.d.); Chou (n.d.) | Day 7 is the first milestone that matters: put the first Goat there. No freeze in v1 (PRD), so soften breaks with framing, not mechanics. |
| 4 | Endowed progress: people given a visible head start toward a goal persist almost twice as often (34% vs 19% completion) for identical effort. | Nunes & Drèze (2006), *JCR* | The milestone track should show "day 1 of 7" lit the moment the first take is submitted, with days 2 to 7 as greyed silhouettes. The Menagerie grid does this naturally: today's slot is already outlined before you record. |
| 5 | Hook model: trigger, action, variable reward, investment. Daily games mostly rely on internal triggers (habit) plus the share artifact seen in a chat as the external trigger. | Eyal (2014), via Amplitude (n.d.) and Eyal (2018) | Variable reward = the reveal (which creature, which absurd recipe). Investment = the kept take and the growing Menagerie. Trigger in v1 = countdown to the next recipe plus share cards in friends' chats; no push. |
| 6 | Permission prompts fired without a user gesture are approved ~12% of the time; after a user gesture, ~30% (Chrome data). Explain what the mic is for before the browser asks; handle denial with a recovery path. | web.dev (n.d.); Digital Thrive (n.d.); Smales (2019) | Never request the mic on page load. The first "Record" tap shows a one-line explainer, then requests. Denied state gets step-by-step re-enable instructions per browser. |
| 7 | "Voice confrontation": people dislike their recorded voice because bone conduction makes their own voice sound deeper to them; familiarity (mere exposure) reduces the dislike; self-ratings are harsher than listeners' ratings. | The Conversation (2021); ScienceDaily (2013); Big Think (n.d.) | The biggest drop-off risk is the first playback. Every direction frames the playback as *the character's* voice, not the user's, keeps it private by default, and states that discards never leave the device. Repetition (3 takes, practice mode) is itself the cure. |
| 8 | Onboarding works best by doing, one mechanic at a time, with the "aha" delivered before any commitment. Greyed-out future milestones motivate more than plain rewards. | UX Design Institute (n.d.); StriveCloud (n.d.); Purchasely (n.d.) | Anonymous spin + rehearse *is* the onboarding. No tutorial screens. Each wheel carries its coaching hint inline. Sign-in is asked only at keep/submit, after the fun has happened. |
| 9 | Connections: ~9 of 10 players finish a puzzle they start; result sharing is what made both Wordle and Connections social. NYT keeps stats (streak, best streak, badges) as the retention surface. | TechCrunch (2023); NYT Games listings | A stats sheet (current streak, best streak, creatures collected, takes used) is table stakes and belongs on the Menagerie page, not the play page. |
| 10 | Game accessibility: contrast 4.5:1 text and 3:1 UI, respect reduced motion, never convey information by color alone, every essential action reachable by keyboard and screen reader. | Game Accessibility Guidelines (n.d.); Microsoft (n.d.); Filament Games (n.d.) | The slot-machine reveal needs an instant-set fallback under `prefers-reduced-motion`, an `aria-live` announcement of the settled recipe, and text labels on every wheel (never color-only). The script text doubles as the transcript on every share page (PRD §8). |

---

## 2. Shared baseline (true in all three directions)

- **Core loop and invariants exactly as the PRD:** land, spin (deterministic reveal), take (30s cap, keep/discard, discards never upload), submit (1/day in the schema), payoff, share, tomorrow.
- **Mic flow:** explainer sentence on first Record tap, then the browser prompt; denied state shows recovery steps; every screen with a recorder states "Audio stays on your device until you keep a take" in one sentence.
- **Voice-data policy** page linked from the recorder and the share page, in the plain language of PRD §11.
- **Share text card** uses middle dots as separators, not em dashes (the shared UI conventions ban em/en dashes in user-facing copy; the PRD example used them): `VoGoat #31 🐁 tiny · menacing · elder · hushed · float · take 2/3 · vogoat.witus.online`. The emoji creature glyph stays: in a chat the emoji is the medium, as in Wordle's grid.
- **Stats:** current streak, best streak, creatures collected, missed days (as silhouettes), first Goat at day 7, then 30, 100 (goat reserved for milestones, PRD §3).
- **Accessibility:** reduced-motion fallbacks, `aria-live` reveal, 44px targets, light + dark both contrast-checked, slate neutrals, focus rings per the shared conventions.
- **Small screens first (BAM, 2026-08-31):** design at 375×667 and verify at 320px wide. The primary action of every step (Record, Keep, Submit, Share) lives in a bottom action bar that is on screen without scrolling; wheels, labels, and cards are compact; no horizontal scroll; text never below 12px. Desktop is the phone layout centered, not a separate design.
- **Daily boundary:** one canonical "VoGoat day" for everyone, configured by `DAILY_TIMEZONE` (default `UTC`, labeled as a fallback in code and UI copy). Open question 1 below.
- **DX baseline (ecosystem standard):** Next.js 16 App Router, TypeScript strict, Tailwind v4, pnpm, Neon + Drizzle (`src/db/schema/*.ts` per group), Better Auth 1.6 as `genericOAuth` client of `accounts.witus.online` (discovery URL per the shop-witus / stream-witus wiring), zod `env.ts` with build-phase placeholders, server-action envelope `{ ok, data } | { ok: false, error, code }`, Vitest for pure logic, PGlite-backed integration tests for the schema invariants (1 submission/day, take cap, expiry nulls the blob and keeps the row), Playwright happy path with a fake microphone. Domain logic lives in pure modules (`src/lib/game/`: recipe wheels + hints, variety-biased sampler, streak math, day boundary, share-card formatter, never-dark fallback). The recorder is one client island; uploads happen client-to-Blob with a server-issued token bound to a take id, so the server never receives a discarded take.

---

## 3. The three directions

### Direction A — "Marquee" (arcade theater)

- **Identity:** the reveal is the show. Dark stage (slate-950), marquee gold accent, chunky display type (Unbounded) over Geist body. The eight wheels are physical reels that drop and settle one by one (CSS keyframes, staggered; reduced-motion sets them instantly). The creature card is a foil-bordered trading card that flips from silhouette to full color on submit.
- **Retention lever:** the event. Big countdown to the next recipe, a lit-bulb streak marquee, and a milestone track with Goats at 7 / 30 / 100 (day 1 lights immediately: endowed progress). The Menagerie is a trophy case with unlit slots for missed days.
- **Sharing lever:** the trading card. The OG image *is* the card (creature, recipe pills, take 2/3, day count). Text card as baseline.
- **Voice-anxiety frame:** "You are not you today. You are the Tiny Menacing Elder Mouse." The card is the mask; playback is labeled with the character's name.
- **DX variant:** client state machine for the stage (`idle → spinning → revealed → recording → review → kept → submitted`) as a discriminated-union reducer; deterministic reveal timeline; the `kept` state is the only state that can hold an upload token (the invariant is in the types). Most JS of the three.
- **Tradeoffs:** loudest, most motion, most client code, most a11y work. "Slot machine" visuals near a 13+ audience need care: no coins, no jackpots, no money metaphors anywhere.
- **Registry accent:** `amber` (shared with Work.WitUS and Create.WitUS; reuse avoids a breaking `Accent` union change).

### Direction B — "Field Guide" (editorial naturalist)

- **Identity:** the creature is the specimen and the Menagerie is the field guide. Warm paper ground, slate ink, moss and ochre accents, Instrument Serif display over Geist body. The recipe is a specimen label (name in italics, the eight wheels as a two-column table with hints). The creature is a line-art plate; missed days are dotted "not observed" frames.
- **Retention lever:** the collection. The Menagerie is the home page's spine ("13 observed · 3 not observed · best run 13 days"). Streak is present but second, best streak always beside it (softens breaks; finding 2). The Goat is a "rare specimen" at day 7 / 30 / 100.
- **Sharing lever:** the specimen plate. A framed plate image with the creature, its full name, the take count, and the script as caption (transcript for free). Text card as baseline.
- **Voice-anxiety frame:** "field recording". Playback is labeled "specimen call, take 2"; you are documenting a creature, not auditioning.
- **DX variant:** server-first. Pages are React Server Components; the recorder is the only heavy client island. The reveal is CSS-only (staggered `animation-delay`, no JS timeline). One `renderCreatureSvg(layers)` module renders the creature in the page *and* in the `next/og` share image, so the art has one source of truth. Share pages are static per slug and revalidated by tag. Least client JS of the three.
- **Tradeoffs:** the quietest reveal (the PRD calls the reveal "theater"; here it is a label printing itself, which still reads as an event but not a spectacle). Serif at phone sizes needs discipline. Paper aesthetics can date if over-textured, so: subtle tint, no faux paper grain.
- **Registry accent:** `lime` (shared with AwesomeWebStore and RideWitUS).

### Direction C — "On Air" (studio booth)

- **Identity:** the voice-actor's booth. Deep slate ground, on-air red and meter green, Archivo (wide) display with JetBrains Mono readouts over Geist body. The eight wheels are a labeled rack with LEDs and inline hints. Recording shows a live input level meter; playback shows a waveform. The creature card is a session slate.
- **Retention lever:** craft. Coaching hints are foregrounded (each wheel a tiny lesson), the take number is a skill flex ("nailed it in 1"), and after playback a no-ML self-check ("Did you hit: tiny, menacing, elder, hushed, float?") turns listening into an investment step without analyzing audio (invariant 6 intact). Streak reads as "on-air days". Practice mode (paid) is the natural extension: "open the booth".
- **Sharing lever:** audio-first. The share page leads with a big play button and waveform over the script caption; the text card as baseline.
- **Voice-anxiety frame:** professional normalization. Everyone in a booth hears themselves; the meter and "take" vocabulary shift attention from "how do I sound" to "did I hit the recipe".
- **DX variant:** audio-engineering forward. Web Audio `AnalyserNode` for the live meter (never leaves the device), MediaRecorder with mime negotiation (webm/Opus, mp4/AAC), waveform peaks computed client-side and stored as a small JSON column so share pages draw a waveform without decoding audio, Playwright E2E with `--use-fake-device-for-media-stream`. Adds two small additive columns beyond PRD §12 (`take.peaks`, `take.self_check`), flagged for approval.
- **Tradeoffs:** can intimidate the casual 13+ player, and the booth metaphor sits closest to "voice course" territory (RideWitUS / Learn.WitUS own curriculum; VoGoat must stay a toy). Dark-first needs an equally good light theme per the conventions.
- **Registry accent:** `rose` (shared with FlashLearnAI and Stream.WitUS), or `emerald` for the meter green.

---

## 4. Side by side

| | A · Marquee | B · Field Guide | C · On Air |
|---|---|---|---|
| Primary retention lever | The daily event + streak marquee | The collection (never breaks) | Craft + self-check |
| Share artifact | Trading card image | Specimen plate image | Audio-first page + waveform |
| Reveal | Reels drop and settle (JS timeline) | Label prints itself (CSS only) | Rack LEDs light in sequence |
| Voice-anxiety frame | The mask | The field recording | The booth |
| Client JS | Most | Least | Middle (Web Audio) |
| Schema beyond PRD §12 | None | None | Two additive columns |
| Biggest risk | Casino-adjacent visuals, motion load | Quiet payoff | Feels like a course, niche |

**Recommendation:** B, Field Guide. The PRD forbids streak repair, and the research says a broken streak on display *reduces* return visits, so the never-breaking Menagerie is the safest primary progress display VoGoat can have; B makes it the spine of the product. It also makes the creature the hero (the PRD's own kill-criteria fix is "the payoff, never more wheels"), it is the most distinctive look against the ecosystem's utilitarian siblings while working in light and dark, and it ships the least client JS for a three-minute daily toy. Two elements from the others are worth adopting later regardless of pick: C's live level meter and waveform in paid practice mode, and A's stagger timing for the reveal so B's label-print still lands as an event.

---

## 5. Open questions for BAM (answers unblock coding)

1. **Daily boundary time zone.** Proposed: one global "VoGoat day" that flips at 00:00 UTC (`DAILY_TIMEZONE` env, UTC labeled as the fallback). Alternative: flip at midnight America/Indiana/Indianapolis so BAM's own day matches the game's. Per-device local midnight (Wordle-style) is not recommended: it lets a clock change reveal tomorrow's recipe.
2. **Script batch 01 triage** (witus task 79 step 2). Invariant 3 says never ship an unapproved script, so the first real dailies wait on `use` / `backlog` marks. Until then the local seed loads the 20 as `candidate` and a dev-only seed approves them in the *local* database only (guarded by an explicit `ALLOW_DEV_SEED=1`).
3. **Provisioning status** (repo task 01): is Neon / Vercel / the OIDC client done? No `.env.local` exists locally. Coding can start against a local Postgres (14 is installed via Homebrew, not running) or PGlite; deploy and SSO wait on steps 2 to 4.
4. **Witus registry changes.** VoGoat is not yet in `gemini/witus/lib/identity/clients.ts` (OIDC client, callback `/api/auth/oauth2/callback/witus`) or `lib/products.ts` (product card, accent). Claude proposes to add both on a `feat/register-vogoat` branch in the witus repo during the auth phase, using the accent of the chosen direction.
5. **Share-card separator.** Middle dots instead of the PRD's em dashes (shared conventions). Confirm.
6. **Dev sign-in.** SSO-only in production (PRD). In development, when no OIDC client is configured, allow a dev-only magic link that prints to the console so the keep / submit / Menagerie flows can be built before the OIDC client exists. Confirm.
7. **If C (or C's self-check) is chosen:** approve the two additive columns (`take.peaks`, `take.self_check`).

---

## References

Amplitude. (n.d.). *The Hook Model: Retain users by creating habit-forming products*. https://amplitude.com/blog/the-hook-model

Apptitude. (n.d.). *App teardown: How Duolingo's streak mechanic actually works*. https://apptitude.io/blog/how-duolingos-streak-mechanic-actually-works/

Axios. (2022, March 25). *Wordle's creator says the game used to have a much harder wordlist*. https://www.axios.com/2022/03/25/wordle-wordlist-josh-wardle-gdc

BeyondGames. (2022). *GDC 2022: Wordle creator Josh Wardle tells all*. https://www.beyondgames.biz/21225/gdc-2022-wordle-creator-josh-wardle-tells-all/

Big Think. (n.d.). *Why do we hate the sound of our own voices?* https://bigthink.com/neuropsych/why-we-hate-the-sound-of-our-own-voices/

Chou, Y. (n.d.). *Streak design: The 5 steps behind Duolingo's daily loop*. https://yukaichou.com/gamification-study/master-the-art-of-streak-design-for-short-term-engagement-and-long-term-success/

Digital Thrive. (n.d.). *Get microphone permission: Best practices for web applications*. https://digitalthriveai.com/en-us/resources/docs/ui-ux/get-microphone-permission/

Eyal, N. (2014). *Hooked: How to build habit-forming products*. Portfolio/Penguin.

Eyal, N. (2018). *Optimize app retention with the Hooked model*. Google Play Apps & Games, Medium. https://medium.com/googleplaydev/optimize-app-retention-with-the-hooked-model-a0781f8e5d29

Filament Games. (n.d.). *Accessibility terms for game developers: A WCAG 2.1 AA glossary*. https://www.filamentgames.com/blog/accessibility-terms-for-game-developers-a-wcag-2-1-aa-glossary

Game Accessibility Guidelines. (n.d.). *Full list*. https://gameaccessibilityguidelines.com/full-list/

Game Developer. (2022). *Josh Wardle reflects on the unconventional road to Wordle's success*. https://www.gamedeveloper.com/marketing/josh-wardle-reflects-on-the-the-unconventional-road-to-wordle-s-success

Just Another PM. (n.d.). *The psychology behind Duolingo's streak feature*. https://www.justanotherpm.com/blog/the-psychology-behind-duolingos-streak-feature

Microsoft. (n.d.). *Xbox Accessibility Guideline 102*. https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102

Nunes, J. C., & Drèze, X. (2006). The endowed progress effect: How artificial advancement increases effort. *Journal of Consumer Research, 32*(4), 504–512. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=991962

Purchasely. (n.d.). *The best app onboarding examples and best practices to engage users*. https://www.purchasely.com/blog/app-onboarding

ScienceDaily. (2013, September 12). *Hate the sound of your voice? Not really*. https://www.sciencedaily.com/releases/2013/09/130912112733.htm

Silverman, J., & Barasch, A. (2023). On or off track: How (broken) streaks affect consumer decisions. *Journal of Consumer Research, 49*(6), 1095–1117. https://academic.oup.com/jcr/article-abstract/49/6/1095/6623414

Slate. (2022, January). *Wordle: Game creator Josh Wardle on strategy, stats, and why it went viral*. https://slate.com/culture/2022/01/wordle-game-creator-wardle-twitter-scores-strategy-stats.html

Smales, M. (2019). *Always on: Best practices for audio UX on microphone enabled devices*. Chirp, Medium. https://medium.com/chirp-io/even-the-speakers-have-ears-c32df8b795b4

StriveCloud. (n.d.). *11 onboarding gamification examples that work*. https://strivecloud.io/uncategorized/gamification-examples-onboarding/

TechCrunch. (2022, January 12). *A conversation with Josh Wardle, creator of viral hit Wordle*. https://techcrunch.com/2022/01/12/josh-wardle-interview-wordle/

TechCrunch. (2023, August 28). *Connections is the New York Times' most played game after Wordle*. https://techcrunch.com/2023/08/28/connections-is-the-new-york-times-most-played-game-after-wordle

The Conversation. (2021). *Why do we hate the sound of our own voices?* https://theconversation.com/why-do-we-hate-the-sound-of-our-own-voices-158376

UX Design Institute. (n.d.). *UX onboarding best practices in 2025: A designer's guide*. https://www.uxdesigninstitute.com/blog/ux-onboarding-best-practices-guide/

web.dev. (n.d.). *Recording audio from the user*. https://web.dev/media-recording-audio/
