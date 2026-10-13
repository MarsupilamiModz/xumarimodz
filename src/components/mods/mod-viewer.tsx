"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { useNavUser } from "@/lib/nav-user-client";
import { FavoriteButton } from "@/components/mods/favorite-button";
import { ModPurchaseButton } from "@/components/mods/mod-purchase-button";
import { ReviewForm } from "@/components/mods/review-form";
import { ModDependenciesPanel } from "@/components/mods/mod-dependencies-panel";
import { formatMoneyFromCents } from "@/lib/currency";
import type { ModViewerState } from "@/app/api/mods/[id]/viewer/route";

/*
 * Nutzerbezogene Teile der Mod-Seite. Die Seite rendert für Gäste (cachebar, ISR); für Angemeldete
 * holen diese Bausteine Favorit, Kauf und fehlende Abhängigkeiten über /api/mods/[id]/viewer nach.
 */

const cache = new Map<string, Promise<ModViewerState | null>>();

function loadViewer(modId: string) {
  let pending = cache.get(modId);
  if (!pending) {
    pending = fetch(`/api/mods/${encodeURIComponent(modId)}/viewer`, { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<ModViewerState>) : null))
      .catch(() => null);
    cache.set(modId, pending);
  }
  return pending;
}

/** Nach Favorit/Kauf/Download erneut laden lassen. */
export function invalidateModViewer(modId: string) {
  cache.delete(modId);
}

function useModViewer(modId: string): { signedIn: boolean | null; data: ModViewerState | null } {
  const { status, user } = useNavUser();
  const [data, setData] = useState<ModViewerState | null>(null);
  const userId = status === "user" ? user.id : null;

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }
    let active = true;
    void loadViewer(modId).then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, [modId, userId]);

  return { signedIn: status === "loading" ? null : status === "user", data };
}

function signInHref(locale: string, slug: string) {
  return `/${locale}/login?redirect=/${locale}/mods/${slug}`;
}

export function ModFavoriteLive({ modId }: { modId: string }) {
  const { data } = useModViewer(modId);
  // key: Startwert übernehmen, sobald der Zustand des Nutzers geladen ist
  return <FavoriteButton key={data ? `u${data.favorited}` : "guest"} modId={modId} initialFavorited={!!data?.favorited} />;
}

export function ModPurchaseLive({
  modId,
  slug,
  locale,
  pricing,
  priceCents,
}: {
  modId: string;
  slug: string;
  locale: string;
  pricing: string;
  priceCents: number | null;
}) {
  const t = useTranslations("mods");
  const { signedIn, data } = useModViewer(modId);
  const isPaid = pricing === "PAID" && !!priceCents && priceCents > 0;

  if (signedIn) {
    if (!isPaid) return null;
    return (
      <div className="mt-3">
        <ModPurchaseButton modId={modId} priceCents={priceCents!} owned={!!data?.owned} locale={locale} />
      </div>
    );
  }

  return (
    <>
      {isPaid && <p className="mt-3 text-center text-lg font-bold tabular-nums text-ink">{formatMoneyFromCents(priceCents!, locale)}</p>}
      {pricing !== "FREE" && signedIn === false && (
        <p className="mt-3 text-sm text-ink-muted">
          <Link href={signInHref(locale, slug)} className="link font-semibold">
            {t("signIn")}
          </Link>{" "}
          – {t("signInForPremium")}
        </p>
      )}
    </>
  );
}

export function ModReviewLive({ modId, slug, locale }: { modId: string; slug: string; locale: string }) {
  const t = useTranslations("mods");
  const { signedIn } = useModViewer(modId);
  if (signedIn) return <ReviewForm modId={modId} />;
  return (
    <p className="text-sm text-ink-muted">
      <Link href={signInHref(locale, slug)} className="link font-semibold">
        {t("signIn")}
      </Link>{" "}
      · {t("leaveReview")}
    </p>
  );
}

type DependenciesProps = ComponentProps<typeof ModDependenciesPanel> & { modId: string };

export function ModDependenciesLive({ modId, missing, required, ...rest }: DependenciesProps) {
  const { data } = useModViewer(modId);
  const userMissing = data ? required.filter((d) => data.missingDependencyIds.includes(d.dependency.id)) : missing;
  return <ModDependenciesPanel key={data ? "user" : "guest"} required={required} missing={userMissing} {...rest} />;
}
