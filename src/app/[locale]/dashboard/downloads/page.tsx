import Link from "next/link";
import { Download } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";

export default async function DownloadsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const user = await requireAuth(`/${locale}/login`);
  const [t, ta, tc] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("accountPages.downloads"),
    getTranslations("common"),
  ]);

  const downloads = await prisma.download.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      mod: { select: { slug: true, title: true } },
      version: { select: { version: true } },
    },
  });

  return (
    <div>
      <PageHeader title={t("downloads")} description={ta("description")} />
      <DataTable
        caption={t("downloads")}
        rows={downloads}
        rowKey={(d) => d.id}
        rowHref={(d) => `/${locale}/mods/${d.mod.slug}`}
        empty={
          <EmptyState
            icon={Download}
            title={ta("emptyTitle")}
            description={t("emptyDownloads")}
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${locale}/mods`}>{tc("browseMods")}</Link>
              </Button>
            }
          />
        }
        columns={[
          {
            key: "mod",
            header: ta("colMod"),
            width: "minmax(0,2fr)",
            cell: (d) => <span className="block truncate font-medium text-ink">{d.mod.title}</span>,
          },
          {
            key: "version",
            header: ta("colVersion"),
            width: "120px",
            hideOnMobile: true,
            cell: (d) => <span className="mono-id">{ta("version", { version: d.version.version })}</span>,
          },
          {
            key: "date",
            header: ta("colDate"),
            width: "160px",
            align: "right",
            cell: (d) => <span className="text-ink-muted">{formatDateTime(d.createdAt, locale)}</span>,
          },
        ]}
      />
    </div>
  );
}
