import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatNumber } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function CreatorCollectionsPage(
  props: {
    params: Promise<{ locale: Locale }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("ecosystem");
  const tp = await getTranslations("creatorPages.collections");
  const user = await requireAuth(`/${locale}/login`);

  const collections = await prisma.modCollection.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true, followers: true } } },
  }).catch(() => []);

  const newHref = `/${locale}/creator/collections/new`;

  return (
    <div>
      <PageHeader
        level="h2"
        title={tp("title")}
        description={tp("description")}
        actions={
          <Button variant="outline" asChild>
            <Link href={newHref}>
              <Plus className="h-4 w-4" aria-hidden />
              {tp("new")}
            </Link>
          </Button>
        }
      />

      <DataTable
        caption={tp("title")}
        rows={collections}
        rowKey={(c) => c.id}
        rowHref={(c) => `/${locale}/creator/collections/${c.id}`}
        empty={<EmptyState icon={Layers} title={tp("emptyTitle")} description={tp("emptyText")} />}
        columns={[
          {
            key: "title",
            header: tp("colTitle"),
            width: "minmax(0,2fr)",
            cell: (c) => (
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium text-ink">{c.title}</span>
                {c.isFeatured && <StatusBadge tone="info" label={t("featured")} />}
              </span>
            ),
          },
          {
            key: "mods",
            header: tp("colMods"),
            width: "90px",
            align: "right",
            cell: (c) => formatNumber(c._count.items, locale),
          },
          {
            key: "followers",
            header: tp("colFollowers"),
            width: "100px",
            align: "right",
            hideOnMobile: true,
            cell: (c) => formatNumber(c._count.followers, locale),
          },
          {
            key: "visibility",
            header: tp("colVisibility"),
            width: "140px",
            hideOnMobile: true,
            cell: (c) => <span className="text-ink-muted">{tp(`visibility.${c.visibility}`)}</span>,
          },
        ]}
      />
    </div>
  );
}
