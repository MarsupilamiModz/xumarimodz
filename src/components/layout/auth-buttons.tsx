"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/lazy-client";
import { onProfileAvatarUpdated } from "@/lib/profile-media-events";
import { resolveAvatarDisplayUrl, bustAvatarUrl } from "@/lib/avatar-url";
import { DEFAULT_AVATAR_DATA_URI } from "@/lib/assets";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import type { NavUser } from "@/components/layout/user-nav";
import type { UserRole } from "@prisma/client";

function AuthLoadingAvatar() {
  return (
    <div className="flex items-center gap-2 px-2" aria-hidden>
      <span className="block h-8 w-8 animate-pulse rounded-full bg-elevated" />
    </div>
  );
}

// Konto-Menü (Radix-Dropdown) nur für angemeldete Nutzer laden – Gäste laden es nie.
const UserNav = dynamic(() => import("@/components/layout/user-nav").then((m) => m.UserNav), {
  loading: () => <AuthLoadingAvatar />,
});

export function AuthButtons({
  locale,
  user: initialUser,
}: {
  locale: string;
  user: NavUser | null;
}) {
  const t = useTranslations("nav");
  const [user, setUser] = useState<NavUser | null>(initialUser);
  const [hasSession, setHasSession] = useState(!!initialUser);
  const [ready, setReady] = useState(!!initialUser);

  useEffect(() => {
    setUser(initialUser);
    setHasSession(!!initialUser);
    if (initialUser) setReady(true);
  }, [initialUser]);

  const syncUser = useCallback(async () => {
    const supabase = await getBrowserSupabase();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setHasSession(false);
      setUser(null);
      setReady(true);
      return;
    }

    setHasSession(true);

    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data?.id) {
          setUser(data);
          setReady(true);
          return;
        }
      }
    } catch {
      /* fall through to session fallback */
    }

    const oauthAvatar =
      resolveAvatarDisplayUrl(authUser.user_metadata?.avatar_url as string | undefined) ??
      DEFAULT_AVATAR_DATA_URI;

    setUser((prev) => ({
      id: authUser.id,
      username: prev?.username ?? authUser.email?.split("@")[0] ?? "user",
      displayName:
        prev?.displayName ??
        (authUser.user_metadata?.full_name as string | undefined) ??
        null,
      avatarUrl: prev?.avatarUrl ?? oauthAvatar,
      role: prev?.role ?? ("USER" as UserRole),
      isPremium: prev?.isPremium ?? false,
      permissions: prev?.permissions,
    }));
    setReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void syncUser();

    void getBrowserSupabase().then((supabase) => {
      if (!active) return;
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        void syncUser();
      });
      unsubscribe = () => subscription.unsubscribe();
    });

    const stopAvatarListener = onProfileAvatarUpdated(({ avatarUrl }) => {
      const busted = avatarUrl ? bustAvatarUrl(avatarUrl) : DEFAULT_AVATAR_DATA_URI;
      setUser((prev) => (prev ? { ...prev, avatarUrl: busted } : prev));
      void syncUser();
    });

    return () => {
      active = false;
      unsubscribe?.();
      stopAvatarListener();
    };
  }, [syncUser]);

  if (hasSession) {
    if (!ready || !user) return <AuthLoadingAvatar />;
    return <UserNav locale={locale} user={user} />;
  }

  // Registrieren ist über die Anmeldeseite (umschaltbar) und das Mobil-Menü erreichbar.
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/${locale}/login`}>{t("login")}</Link>
    </Button>
  );
}
