/**
 * The in-app help: one guide per thing a player can do (BAM, 2026-09-02).
 *
 * Every guide carries its own walkthrough slot. To publish a video, paste the YouTube video id
 * (the part after `v=`) into that guide's `videoId` and ship it. Nothing else has to change.
 *
 * Copy rules for this file: short plain sentences, no em or en dashes, and the banned-word list
 * in tests/how-to.test.ts. Steps must match what the app actually does.
 */

export type Guide = {
  /** URL segment under /how-to. */
  slug: string;
  title: string;
  /** One line for the index card and the page description. */
  blurb: string;
  steps: string[];
  /** YouTube video id, or null while the walkthrough is still to be filmed. */
  videoId: string | null;
  /** Optional footnote under the steps. */
  note?: string;
};

export const GUIDES: Guide[] = [
  {
    slug: "play-today",
    title: "Play today's recipe",
    blurb: "The whole daily, start to finish: read the recipe, record, keep, submit.",
    videoId: null,
    steps: [
      "Open VO GOAT. Today's specimen is already on the page, and it is the same one everyone on Earth gets.",
      "Read the eight rows on the specimen card: effort, place, air, age, size, tempo, volume, and attitude. That is the voice.",
      "Tap any row to swap the line underneath it for that trait's coaching hint.",
      "Read the line under Read aloud to yourself once or twice in that voice.",
      "Tap Record a take. Your browser asks for the microphone the first time you do.",
      "Say the line. Takes stop themselves at 30 seconds, or tap Stop when you are done.",
      "Listen back, then tap Keep this take to save it or Discard to throw it away.",
      "On a kept take, tap Submit as today's entry. The plate fills in and joins your Guild.",
    ],
    note: "Reading the recipe and rehearsing work without an account. Keeping a take and submitting need one.",
  },
  {
    slug: "sign-in",
    title: "Sign in",
    blurb: "One WitUS account covers every WitUS app, including this one.",
    videoId: null,
    steps: [
      "Tap Sign in at the top right of the daily page.",
      "Tap Sign in with WitUS. The same account works across the whole WitUS ecosystem.",
      "If the button already reads Continue as your name, WitUS recognises this browser. Tapping it still runs the full sign-in.",
      "You land back on today's specimen with your name in the header.",
      "To leave, tap Sign out. That ends your session in every WitUS app, not only this one.",
    ],
    note: "No account needed to see the recipe, read the line, or rehearse. Keeping takes, submitting, streaks, the Guild, and sharing all need one.",
  },
  {
    slug: "your-takes",
    title: "Your takes for the day",
    blurb: "Three takes a day on the free plan, one submission on every plan.",
    videoId: null,
    steps: [
      "Tap Record a take. The button tells you which take you are on, like Take 1 of 3.",
      "Free accounts get 3 takes a day. Starting a recording spends one, so warm up before you tap.",
      "Stop when you are done, or let the take end itself at 30 seconds.",
      "Play it back in the review panel. Nobody else can hear it yet.",
      "Tap Keep this take to save it, or Discard to delete it from your device.",
      "Kept takes stack up on the daily page, each with its own player, so you can compare them.",
      "Tap Submit as today's entry on the one you like best.",
      "Discarding still spends the take. If it is your last one and nothing is kept, VO GOAT asks you to confirm before it lets you.",
    ],
    note: "Paid plans record as many takes a day as they want. Every plan still submits exactly one.",
  },
  {
    slug: "share",
    title: "Share your take",
    blurb: "Copy the spoiler-free card, and add an audio link only if you want to.",
    videoId: null,
    steps: [
      "Submit a take. The Share panel appears under today's specimen.",
      "Tap Copy card. The card names the creature and the recipe traits, and it gives away no audio.",
      "Paste it wherever you like.",
      "Want people to hear it? Tap Create audio link. It stays off until you ask for it.",
      "Tap Copy audio link and send it to whoever you choose.",
      "That page is unlisted and never indexed. It plays your take with the script as the transcript, and every visitor sees a report button.",
      "Tap Revoke link when you are finished. The old link stops working for good.",
      "Sharing again mints a fresh link with a new address.",
    ],
    note: "There is no public feed and no way to browse strangers. Sharing is a link you hand out.",
  },
  {
    slug: "guild",
    title: "Read your Guild",
    blurb: "Plates, silhouettes, runs, and the Goats you collect at 7, 30, and 100 days.",
    videoId: null,
    steps: [
      "Tap Guild in the header once you are signed in.",
      "The four counters across the top read observed, missed, current run, and best run.",
      "Every day you submitted shows as a filled plate. Tap play on a plate to hear that take again.",
      "A dashed frame around a silhouette is a day you missed. It stays a silhouette, because no day can be filled in later.",
      "A run counts days in a row. Miss a day and the current run restarts, while your best run stands.",
      "Rare specimens land when your run reaches 7, 30, and 100 days.",
      "Plates and runs are permanent. On the free plan the audio behind a plate goes after 30 days and the plate reads audio expired.",
    ],
  },
  {
    slug: "archive",
    title: "Browse past specimens",
    blurb: "Every recipe the world has already played, one page each.",
    videoId: null,
    steps: [
      "Open Every specimen in the footer, or go straight to /archive.",
      "Every day since launch is listed with its creature, its number, its date, and its headline traits.",
      "Tap one to open its page: the full eight-row recipe, the line everyone read that day, and the creature.",
      "Today is never in the archive. It joins the list after midnight UTC, once the day is over.",
      "Past days are for reading. You cannot record an entry for a day that has closed.",
    ],
    note: "The archive is public, so a specimen page is safe to link to anyone.",
  },
  {
    slug: "practice",
    title: "Use the practice room",
    blurb: "Any of the 11,664 recipes on demand, with nothing counted against the daily.",
    videoId: null,
    steps: [
      "Open Practice room in the footer, or go to /practice.",
      "Signed in on a paid plan, the room opens with a recipe already on the table.",
      "Tap Spin another recipe to pull a different one out of all 11,664.",
      "Read anything you like in that voice. Yesterday's grocery list works.",
      "Record as often as you want. Nothing in this room is counted, uploaded, or added to your Guild.",
      "Tap Today when you are warm and ready for the real one.",
    ],
    note: "The practice room comes with the lifetime, monthly, and annual plans. On the free plan the page explains what it does and links to the plans.",
  },
  {
    slug: "upgrade",
    title: "Upgrade your plan",
    blurb: "What paying buys, what it never buys, and how to pay by card or Cash App.",
    videoId: null,
    steps: [
      "Open Upgrade in the footer, or go to /upgrade.",
      "Sign in first. The plan buttons need an account to attach the purchase to.",
      "Pick a plan: lifetime paid once, monthly, or annual. Annual opens after the first 100 lifetime founders.",
      "Tap the button and pay by card through Stripe. There is a field for a promo code at checkout.",
      "Prefer Cash App? Open the Cash App panel under Lifetime, scan the code, send the exact amount, then enter the display name you paid from.",
      "Cash App payments are matched by hand, usually the same day. Card payments flip your plan within a minute of Stripe confirming.",
      "Refresh the page if your new plan takes a moment to show up.",
    ],
    note: "Paying buys the practice room, unlimited takes a day, audio kept for good, take downloads, and the founder badge. It never buys a second entry into the daily. One submission a day, every tier.",
  },
  {
    slug: "privacy",
    title: "Know what happens to your audio",
    blurb: "Where a recording lives, when it uploads, and when it goes away.",
    videoId: null,
    steps: [
      "Recording happens inside your browser. Nothing reaches VO GOAT while you are recording.",
      "Tap Discard and the audio is deleted from your device. It never leaves it.",
      "Discarding still stores the count of the attempt, which is how 3 takes a day is counted on the free plan.",
      "Tap Keep and that one file uploads. It is yours, and no one else can play it.",
      "Deleting a kept take deletes the audio file itself, not only the row that points at it.",
      "On the free plan, kept audio expires 30 days after the take. The plate, the run, and the share card all stay.",
      "Nothing analyses your voice. The creature comes from the recipe, never from your recording, and your audio is never training data.",
      "Read the whole promise on the Your voice data page.",
    ],
    note: "Revoking a share link kills that link for good, whatever else you keep.",
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
