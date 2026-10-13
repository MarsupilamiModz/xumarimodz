"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getBrowserSupabase, onBrowserSupabaseReady } from "@/lib/supabase/lazy-client";
import { onProfileAvatarUpdated } from "@/lib/profile-media-events";
import { resolveAvatarDisplayUrl, bustAvatarUrl } from "@/lib/avatar-url";
import { DEFAULT_AVATAR_DATA_URI } from "@/lib/assets";
import type { NavUser } from "@/components/layout/user-nav";

/**
 * Angemeldeter Nutzer im Browser. Die Seiten selbst rendern ohne Nutzer (damit sie gecacht werden
 * können); Header, Menü und Werbeflächen holen ihn hier einmal pro Seitenaufruf und teilen ihn.
 */
export type NavUserState =
  | { status: "loading"; user: null }
  | { status: "guest"; user: null }
  | { status: "user"; user: NavUser };

let state: NavUserState = { status: "loading", user: null };
const listeners = new Set<() => void>();
let started = false;
let syncing: Promise<void> | null = null;

function setState(next: NavUserState) {
  state = next;
  listeners.forEach((l) => l());
}

async function sync() {
  const supabase = await getBrowserSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    setState({ status: "guest", user: null });
    return;
  }

  try {
    const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
    if (res.ok) {
      const data = (await res.json()) as NavUser | null;
      if (data?.id) {
        setState({ status: "user", user: data });
        return;
      }
    }
  } catch {
    /* Rückfall auf die Supabase-Sitzung */
  }

  const prev = state.user;
  setState({
    status: "user",
    user: {
      id: authUser.id,
      username: prev?.username ?? authUser.email?.split("@")[0] ?? "user",
      displayName: prev?.displayName ?? (authUser.user_metadata?.full_name as string | undefined) ?? null,
      avatarUrl:
        prev?.avatarUrl ??
        resolveAvatarDisplayUrl(authUser.user_metadata?.avatar_url as string | undefined) ??
        DEFAULT_AVATAR_DATA_URI,
      role: prev?.role ?? ("USER" as UserRole),
      isPremium: prev?.isPremium ?? false,
      permissions: prev?.permissions,
    },
  });
}

/** Erneut laden (nach Login, Profiländerung, Kauf …). Parallele Aufrufe teilen sich eine Abfrage. */
export function refreshNavUser(): Promise<void> {
  syncing ??= sync()
    .catch(() => setState({ status: "guest", user: null }))
    .finally(() => {
      syncing = null;
    });
  return syncing;
}

/** Supabase-Session-Cookie (sb-<projekt>-auth-token, ggf. in Teilen .0/.1) vorhanden? */
export function hasSessionCookie() {
  return typeof document !== "undefined" && /(?:^|;\s*)sb-[^=;]*-auth-token/.test(document.cookie);
}

function start() {
  if (started) return;
  started = true;
  // Ohne Session-Cookie sofort Gast – das Supabase-Bundle wird dann gar nicht erst gebraucht.
  if (hasSessionCookie()) void refreshNavUser();
  else setState({ status: "guest", user: null });
  // Login/Logout auf der Seite mitbekommen, ohne den Client für Gäste extra zu laden.
  onBrowserSupabaseReady((supabase) => {
    supabase.auth.onAuthStateChange(() => void refreshNavUser());
  });
  onProfileAvatarUpdated(({ avatarUrl }) => {
    if (state.status === "user") {
      setState({ status: "user", user: { ...state.user, avatarUrl: avatarUrl ? bustAvatarUrl(avatarUrl) : DEFAULT_AVATAR_DATA_URI } });
    }
    void refreshNavUser();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const serverState: NavUserState = { status: "loading", user: null };

export function useNavUser(): NavUserState {
  const pathname = usePathname();
  useEffect(start, []);
  // Login/Logout per Server-Action + Navigation löst kein Supabase-Ereignis aus: bei jedem Seitenwechsel
  // prüfen, ob Cookie und Zustand noch zusammenpassen.
  useEffect(() => {
    if (state.status === "loading") return;
    if (hasSessionCookie() !== (state.status === "user")) void refreshNavUser();
  }, [pathname]);
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}
