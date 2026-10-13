import { NextResponse } from "next/server";
import { getSession, getCurrentUser } from "@/lib/auth";
import { getNavUser } from "@/lib/nav-user";
import { ensurePrismaUser } from "@/lib/user-sync";
import { getUserAdExperience } from "@/lib/ad-experience";
import { getUserMembershipTier } from "@/lib/membership";
import type { NavUser } from "@/components/layout/user-nav";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Nutzer für Header und Werbeflächen (die Seiten selbst rendern ohne Nutzer und bleiben cachebar). */
async function withAdLevel(user: NavUser | null): Promise<NavUser | null> {
  if (!user) return null;
  try {
    const [adLevel, tier] = await Promise.all([
      getUserAdExperience(user.id, user.role),
      getUserMembershipTier(user.id).catch(() => null),
    ]);
    return { ...user, adLevel, planSlug: tier?.slug ?? null };
  } catch {
    return user;
  }
}

function json(user: NavUser | null) {
  return NextResponse.json(user, { headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  try {
    let user = await getNavUser();
    if (user) return json(await withAdLevel(user));

    const session = await getSession();
    if (!session) return json(null);

    await ensurePrismaUser(session);
    user = await getNavUser();
    return json(await withAdLevel(user));
  } catch (error) {
    console.error("[api/auth/me]", error);

    const session = await getSession();
    if (session) {
      const dbUser = await getCurrentUser();
      if (dbUser) {
        try {
          const user = await getNavUser();
          if (user) return json(await withAdLevel(user));
        } catch {
          /* fall through */
        }
      }
    }

    return json(null);
  }
}
