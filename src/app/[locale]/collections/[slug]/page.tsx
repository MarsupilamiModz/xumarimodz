import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Layers } from "lucide-react";
import { getCollectionBySlug, incrementCollectionView } from "@/lib/collections-data";
import { ModCard } from "@/components/mods/mod-card";
import { CollectionActions } from "@/components/collections/collection-actions";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Locale } from "@/i18n/config";
import { runAfterResponse } from "@/lib/after-response";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage(
  props: {
    params: Promise<{ locale: Locale; slug: string }>;
  }
) {
  const params = await props.params;

  const {
    locale,
    slug
  } = params;

  setRequestLocale(locale);
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();
  if (collection.visibility === "PRIVATE") notFound();

  runAfterResponse(incrementCollectionView(collection.id));

  const user = await getCurrentUser();
  const following = user
    ? await prisma.modCollectionFollow.findUnique({
        where: {
          collectionId_userId: { collectionId: collection.id, userId: user.id },
        },
      })
    : null;

  const [t, te, tc] = await Promise.all([
    getTranslations("publicPages.collections"),
    getTranslations("ecosystem"),
    getTranslations("common.cx.collectionEditor"),
  ]);
  const visibilityLabel: Record<string, string> = {
    PUBLIC: tc("visibilityPublic"),
    PRIVATE: tc("visibilityPrivate"),
    FEATURED: te("featured"),
  };
  const ownerName =
    collection.creator?.user.displayName ??
    collection.creator?.user.username ??
    collection.owner.displayName ??
    collection.owner.username;

  return (
    <div className="page-section">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {collection.isFeatured && <Badge variant="outline">{te("featured")}</Badge>}
        <StatusBadge tone="neutral" label={visibilityLabel[collection.visibility] ?? collection.visibility} />
      </div>
      <PageHeader
        title={collection.title}
        description={collection.description ?? undefined}
        actions={
          <CollectionActions
            collectionId={collection.id}
            modIds={collection.items.map((i) => i.modId)}
            initialFollowing={!!following}
          />
        }
      />
      <p className="meta -mt-3 mb-8 tabular-nums">
        {t.rich("byline", {
          name: ownerName,
          views: collection.viewCount,
          followers: collection.followerCount,
          installs: collection.downloadCount,
          owner: (chunks) => (
            <Link href={`/${locale}/creators/${collection.creator?.slug ?? collection.owner.username}`} className="link">
              {chunks}
            </Link>
          ),
        })}
      </p>

      {collection.items.length === 0 ? (
        <EmptyState icon={Layers} title={tc("noMods")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collection.items.map(({ mod, note }) => (
            <li key={mod.id} className="space-y-2">
              <ModCard locale={locale} mod={mod} />
              {note && <p className="rounded-lg border border-line bg-raised px-4 py-2 text-xs text-ink-muted">{note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
