import { getTranslations, setRequestLocale } from "next-intl/server";
import { KeySquare } from "lucide-react";
import type { LicenseStatus } from "@prisma/client";
import { listLicenses } from "@/actions/admin/licenses";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format-locale";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { LicenseGenerator, LicenseRevokeButton } from "@/components/admin/license-tools";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchField } from "@/components/ui/search-field";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import type { Locale } from "@/i18n/config";

const STATUSES: LicenseStatus[] = ["ACTIVE", "REDEEMED", "PAUSED", "EXPIRED", "REVOKED"];
const TONE: Record<LicenseStatus, StatusTone> = { ACTIVE: "success", REDEEMED: "info", PAUSED: "pending", EXPIRED: "warning", REVOKED: "neutral" };

/** Nur Anfang und Ende zeigen, z. B. „XM7K-••••-••••-Q2PA“. */
function maskKey(key: string) {
  const parts = key.split("-");
  if (parts.length >= 3) return [parts[0], ...parts.slice(1, -1).map(() => "••••"), parts[parts.length - 1]].join("-");
  return key.length > 8 ? `${key.slice(0, 4)}••••${key.slice(-4)}` : "••••";
}

type Params = { status?: string; q?: string; page?: string };

export default async function AdminLicensesPage(
  props: { params: Promise<{ locale: Locale }>; searchParams: Promise<Params> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("licenses.write");
  const t = await getTranslations("admin.li");

  const status = STATUSES.includes(searchParams.status as LicenseStatus) ? (searchParams.status as LicenseStatus) : undefined;
  const q = searchParams.q?.trim().slice(0, 64) || undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const [result, mods] = await Promise.all([
    listLicenses({ page, status, search: q }),
    prisma.mod.findMany({ where: { pricing: "PAID", status: { not: "ARCHIVED" } }, select: { id: true, title: true }, orderBy: { title: "asc" }, take: 300 }),
  ]);

  const base = `/${locale}/admin/licenses`;
  const href = (next: Partial<Params>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, q, ...next })) if (v) p.set(k, String(v));
    const s = p.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <AdminPageHeader title={t("title")} description={result.success ? t("count", { count: result.data.total }) : undefined} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3">
          <ChipTabs
            label={t("status")}
            value={status ?? ""}
            options={[{ value: "", label: t("all") }, ...STATUSES.map((s) => ({ value: s, label: t(`st.${s}`) }))]}
            hrefFor={(v) => href({ status: v || undefined, page: undefined })}
          />
          <form method="get" action={base}>
            {status && <input type="hidden" name="status" value={status} />}
            <SearchField label={t("search")} name="q" defaultValue={q} className="w-full max-w-sm" />
          </form>

          {!result.success ? (
            <AdminLoadError message={t("loadError")} />
          ) : (
            <>
              <DataTable
                caption={t("title")}
                rows={result.data.licenses}
                rowKey={(l) => l.id}
                empty={<EmptyState icon={KeySquare} title={t("emptyTitle")} description={t("emptyText")} />}
                columns={[
                  {
                    key: "key",
                    header: t("colKey"),
                    width: "minmax(0,1.5fr)",
                    cell: (l) => (
                      <span className="min-w-0">
                        <span className="mono-id block truncate text-ink">{maskKey(l.key)}</span>
                        {l.label && <span className="block truncate text-xs text-ink-faint">{l.label}</span>}
                      </span>
                    ),
                  },
                  {
                    key: "product",
                    header: t("colProduct"),
                    hideOnMobile: true,
                    cell: (l) => (
                      <span className="block truncate text-ink-muted">
                        {["premium", "mod", "bundle"].includes(l.productType) ? t(`product.${l.productType}`) : l.productType}
                        {l.mod && <span className="ml-1 text-ink-faint">· {l.mod.title}</span>}
                      </span>
                    ),
                  },
                  {
                    key: "devices",
                    header: t("colDevices"),
                    width: "80px",
                    align: "right",
                    hideOnMobile: true,
                    cell: (l) => `${l._count.activations}/${l.maxActivations}`,
                  },
                  { key: "status", header: t("colStatus"), width: "120px", cell: (l) => <StatusBadge tone={TONE[l.status]} label={t(`st.${l.status}`)} /> },
                  {
                    key: "owner",
                    header: t("colOwner"),
                    hideOnMobile: true,
                    cell: (l) => <span className="truncate text-ink-muted">{l.redeemedBy ? `@${l.redeemedBy.username}` : "—"}</span>,
                  },
                  {
                    key: "created",
                    header: t("colCreated"),
                    width: "100px",
                    hideOnMobile: true,
                    cell: (l) => <span className="tabular-nums text-ink-muted">{formatDate(l.createdAt, locale)}</span>,
                  },
                  {
                    key: "actions",
                    header: t("actions"),
                    width: "100px",
                    align: "right",
                    cell: (l) => (l.status === "REVOKED" ? null : <LicenseRevokeButton id={l.id} maskedKey={maskKey(l.key)} />),
                  },
                ]}
              />
              <Pagination className="mt-6" page={result.data.page} pages={Math.max(1, result.data.pages)} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined })} />
            </>
          )}
        </div>

        <LicenseGenerator mods={mods} />
      </div>
    </div>
  );
}
