import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db/client";
import { user } from "@/db/schema";
import type { Role } from "@/db/schema";
import { isAdminEmail } from "./admin";
import { getAuth, type Session } from "./auth";
import { env } from "./env";

export type SessionUser = Session["user"] & { plan: string; role: Role };

/** Request-cached session read; also heals the admin role if ADMIN_EMAIL changed later. */
export const getSession = cache(async (): Promise<Session | null> => {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as SessionUser;
  if (u.role !== "admin" && isAdminEmail(u.email, env.ADMIN_EMAIL)) {
    const db = await getDb();
    await db.update(user).set({ role: "admin" }).where(eq(user.id, u.id));
    u.role = "admin";
  }
  return session;
});

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session.user as SessionUser;
}

/** Admin surfaces are role-gated (invariant 7) and hidden from everyone else. */
export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "admin") notFound();
  return u;
}
