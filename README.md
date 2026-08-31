# VoGoat

**The daily voiceover game.** One shared voice recipe a day — everyone gets the same recipe,
the same mundane micro-script, the same cartoon creature. Record your take (audio only), submit
your best, collect the creature, share the card. VO = voiceover. GOAT = greatest of all time.
The mascot is a goat.

- **Status:** pre-build — this repo is the locked PRD + seed data; no application code yet.
- **PRD (read first):** [`docs/01-prd.md`](docs/01-prd.md) — decisions locked 2026-08-30.
- **Seed data:** [`data/voice-recipes.csv`](data/voice-recipes.csv) (all 11,664 voice recipes),
  [`data/literary-devices.csv`](data/literary-devices.csv) (88 devices for the admin Workshop).
- **Domain:** `vogoat.witus.online` · a WitUS ecosystem product · sign-in via
  `accounts.witus.online`.

The voice-parameter method adapts Rudolf Laban's effort taxonomy as popularized for voice work
by Darren McStay (Improve Your Voice); VoGoat's scripts and materials are original.

## Contributing / working in this repo

Process rules live in [`CLAUDE.md`](CLAUDE.md) (identity, invariants, and the shared WitUS
rules block). Branch hygiene: work happens on `feat/…` branches, BAM merges to `main`.
Activate the guard hook once per clone:

```
git config core.hooksPath .githooks
```
# vo-goat
