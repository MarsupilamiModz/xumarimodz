import Link from "next/link";
import { KeyRound, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getCreatorExclusivePrograms } from "@/actions/exclusive";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatNumber } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";

const PROGRAM_TYPE_KEYS: Record<string, string> = {
  CLOSED_ALPHA: "programTypeClosedAlpha",
  CLOSED_BETA: "programTypeClosedBeta",
  INVITE_ONLY: "programTypeInviteOnly",
};

export default async function CreatorExclusivePage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  await requireAuth(`/${locale}/login`);
  const result = await getCreatorExclusivePrograms();
  const programs = result.success ? result.data : [];
  const [t, tp, tx] = await Promise.all([
    getTranslations("ecosystem"),
    getTranslations("creatorPages.exclusive"),
    getTranslations("common.cx.exclusiveProgram"),
  ]);

  return (
    <div>
      <PageHeader
        level="h2"
        title={t("exclusiveAccess")}
        description={tp("description")}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/${locale}/creator/exclusive/new`}>
              <Plus className="h-4 w-4" aria-hidden />
              {tp("launch")}
            </Link>
          </Button>
        }
      />

      <DataTable
        caption={t("exclusiveAccess")}
        rows={programs}
        rowKey={(p) => p.id}
        rowHref={(p) => `/${locale}/creator/exclusive/${p.id}`}
        empty={<EmptyState icon={KeyRound} title={tp("emptyTitle")} description={tp("emptyText")} />}
        columns={[
          {
            key: "program",
            header: tp("colProgram"),
            width: "minmax(0,2fr)",
            cell: (p) => (
              <span className="block min-w-0">
                <span className="block truncate font-medium text-ink">{p.title}</span>
                <span className="block truncate text-xs text-ink-faint">{p.mod.title}</span>
              </span>
            ),
          },
          {
            key: "type",
            header: tp("colType"),
            width: "150px",
            hideOnMobile: true,
            cell: (p) => (
              <span className="text-ink-muted">
                {PROGRAM_TYPE_KEYS[p.type] ? tx(PROGRAM_TYPE_KEYS[p.type]) : p.type}
              </span>
            ),
          },
          {
            key: "applications",
            header: tp("colApplications"),
            width: "110px",
            align: "right",
            hideOnMobile: true,
            cell: (p) => formatNumber(p._count.applications, locale),
          },
          {
            key: "builds",
            header: tp("colBuilds"),
            width: "80px",
            align: "right",
            hideOnMobile: true,
            cell: (p) => formatNumber(p._count.builds, locale),
          },
          {
            key: "slots",
            header: tp("colSlots"),
            width: "90px",
            align: "right",
            hideOnMobile: true,
            cell: (p) => (p.maxSlots != null ? tp("slots", { current: p.currentCount, max: p.maxSlots }) : "—"),
          },
          {
            key: "status",
            header: tp("colStatus"),
            width: "110px",
            cell: (p) => (
              <StatusBadge tone={p.isActive ? "success" : "neutral"} label={p.isActive ? tx("active") : tx("inactive")} />
            ),
          },
        ]}
      />
    </div>
  );
}
