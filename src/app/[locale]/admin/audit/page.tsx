import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, ScrollText } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { auditIpLabel, getAuditPage } from "@/lib/admin-audit";
import { AUDIT_CATEGORY_KEYS, auditCategoryOf, type AuditCategory } from "@/lib/audit-categories";
import { formatDateTime } from "@/lib/format-locale";
import { formatDisplayName } from "@/lib/display-name";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchField } from "@/components/ui/search-field";
import type { Locale } from "@/i18n/config";

type Params = { category?: string; q?: string; page?: string };

export default async function AuditLogPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: Params;
}) {
  setRequestLocale(locale);
  await requirePagePermission("audit.read");
  const t = await getTranslations("admin.au");

  const category = AUDIT_CATEGORY_KEYS.includes(searchParams.category as AuditCategory) ? (searchParams.category as AuditCategory) : undefined;
  const q = searchParams.q?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);

  let data: Awaited<ReturnType<typeof getAuditPage>> | null = null;
  try {
    data = await getAuditPage({ category, q }, page);
  } catch (err) {
    console.error("[admin/audit]", err);
  }

  const base = `/${locale}/admin/audit`;
  const query = (next: Partial<Params>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ category, q, ...next })) if (v) p.set(k, String(v));
    return p.toString();
  };
  const href = (next: Partial<Params>) => {
    const s = query(next);
    return `${base}${s ? `?${s}` : ""}`;
  };
  const exportQuery = query({ page: undefined });

  return (
    <div>
      <AdminPageHeader
        title={t("title")}
        description={data ? t("count", { count: data.total }) : undefined}
        actions={
          <Button size="sm" variant="outline" asChild>
            <a href={`/api/admin/audit/export${exportQuery ? `?${exportQuery}` : ""}`} download>
              <Download className="h-4 w-4" aria-hidden />
              {t("export")}
            </a>
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <ChipTabs
          label={t("category")}
          value={category ?? ""}
          options={[{ value: "", label: t("all") }, ...AUDIT_CATEGORY_KEYS.map((c) => ({ value: c, label: t(`cat.${c}`) }))]}
          hrefFor={(v) => href({ category: v || undefined, page: undefined })}
        />
        <form method="get" action={base}>
          {category && <input type="hidden" name="category" value={category} />}
          <SearchField label={t("search")} name="q" defaultValue={q} className="w-full max-w-sm" />
        </form>
      </div>

      {!data ? (
        <AdminLoadError message={t("loadError")} />
      ) : (
        <>
          <DataTable
            caption={t("title")}
            rows={data.rows}
            rowKey={(r) => r.id}
            empty={<EmptyState icon={ScrollText} title={t("emptyTitle")} description={t("emptyText")} />}
            columns={[
              {
                key: "time",
                header: t("colTime"),
                width: "150px",
                cell: (r) => <span className="tabular-nums text-ink-muted">{formatDateTime(r.createdAt, locale)}</span>,
              },
              {
                key: "actor",
                header: t("colActor"),
                width: "minmax(0,1fr)",
                hideOnMobile: true,
                cell: (r) =>
                  r.actor ? (
                    <a href={`/${locale}/admin/users/${r.actor.id}`} className="relative truncate text-ink hover:text-violet-bright">
                      {formatDisplayName(r.actor)}
                    </a>
                  ) : (
                    <span className="text-ink-faint">{t("system")}</span>
                  ),
              },
              {
                key: "action",
                header: t("colAction"),
                width: "minmax(0,1.3fr)",
                cell: (r) => (
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="mono-id truncate text-ink">{r.action}</span>
                    <Badge variant="outline">{t(`cat.${auditCategoryOf(r.entityType)}`)}</Badge>
                  </span>
                ),
              },
              {
                key: "target",
                header: t("colTarget"),
                width: "minmax(0,1.2fr)",
                hideOnMobile: true,
                cell: (r) => (
                  <span className="block truncate text-ink-muted">
                    {r.entityType}
                    {r.entityId && <span className="mono-id ml-1 text-ink-faint">{r.entityId}</span>}
                  </span>
                ),
              },
              {
                key: "ip",
                header: t("colIp"),
                width: "120px",
                hideOnMobile: true,
                cell: (r) => <span className="mono-id text-ink-faint">{auditIpLabel(r.metadata, r.ipHash)}</span>,
              },
            ]}
          />
          <Pagination className="mt-6" page={data.page} pages={data.pages} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined })} />
        </>
      )}
    </div>
  );
}
