import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TOOLS = [
  { href: "/admin/dailies", name: "Daily authoring", detail: "Runway, extend the queue, approve pairings, reroll, swap scripts" },
  { href: "/admin/scripts", name: "Script triage", detail: "The weekly 20-script ritual: use, backlog, never" },
  { href: "/admin/creatures", name: "Creature vetting", detail: "The animal art: live unless marked never" },
] as const;

export default async function AdminHome() {
  await requireAdmin();
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl italic">Admin</span>
        <Link
          href="/"
          className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Today
        </Link>
      </header>
      <ul className="flex flex-col gap-3">
        {TOOLS.map((tool) => (
          <li key={tool.href}>
            <Link
              href={tool.href}
              className="flex min-h-12 flex-col justify-center gap-0.5 rounded-md border border-rule bg-card p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              <span className="font-display text-lg italic">{tool.name}</span>
              <span className="text-xs text-muted">{tool.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
