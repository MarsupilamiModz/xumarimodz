import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Receipt, Repeat } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { userHasPermission } from "@/lib/permission-store";
import { getAdminPurchasesPage, getAdminSubscriptionsPage } from "@/lib/admin-billing";
import { formatDate, formatEuro } from "@/lib/format-locale";
import { formatDisplayName } from "@/lib/display-name";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { RefundAction, SubscriptionActions } from "@/components/admin/billing-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Pagination } from "@/components/ui/pagination";
import { SearchField } from "@/components/ui/search-field";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Locale } from "@/i18n/config";

type Params = { tab?: string; q?: string; page?: string; sel?: string };

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-[13px]">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-right text-ink">{children}</dd>
    </div>
  );
}

function DetailPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="rounded-lg border border-line bg-raised" aria-label={title}>
      <h2 className="section-title flex h-12 items-center border-b border-line px-4">{title}</h2>
      <div className="p-4">{children}</div>
    </aside>
  );
}

export default async function AdminBillingPage({ params: { locale }, searchParams }: { params: { locale: Locale }; searchParams: Params }) {
  setRequestLocale(locale);
  const viewer = await requirePagePermission("subscriptions.read");
  const t = await getTranslations("admin.bi");

  const tab = searchParams.tab === "purchases" ? "purchases" : "subs";
  const q = searchParams.q?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const base = `/${locale}/admin/subscriptions`;
  const href = (next: Partial<Params>) => {
    const p = new URLSearchParams();
    const merged = { tab: tab === "subs" ? undefined : tab, q, page: page > 1 ? String(page) : undefined, sel: searchParams.sel, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    const s = p.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };
  // Aktionen nur mit denselben Rechten, die die Server-Actions prüfen; sonst bleibt das Detailpanel lesend.
  const permUser = { id: viewer.id, role: viewer.role, permissionGroupId: viewer.permissionGroupId };
  const [canManage, canRefund] = await Promise.all([userHasPermission(permUser, "users.write"), userHasPermission(permUser, "settings.write")]);

  let subs: Awaited<ReturnType<typeof getAdminSubscriptionsPage>> | null = null;
  let purchases: Awaited<ReturnType<typeof getAdminPurchasesPage>> | null = null;
  try {
    if (tab === "subs") subs = await getAdminSubscriptionsPage({ q, page });
    else purchases = await getAdminPurchasesPage({ q, page });
  } catch (err) {
    console.error("[admin/subscriptions]", err);
  }

  const selectedSub = subs?.rows.find((r) => r.id === searchParams.sel);
  const selectedPurchase = purchases?.rows.find((r) => r.id === searchParams.sel);

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ChipTabs
          label={t("tabs")}
          value={tab}
          options={[
            { value: "subs", label: t("tabSubs") },
            { value: "purchases", label: t("tabPurchases") },
          ]}
          hrefFor={(v) => href({ tab: v === "subs" ? undefined : v, page: undefined, sel: undefined })}
        />
        <form method="get" action={base} className="w-full max-w-sm">
          {tab !== "subs" && <input type="hidden" name="tab" value={tab} />}
          <SearchField label={t("search")} name="q" defaultValue={q} />
        </form>
      </div>

      {!subs && !purchases ? (
        <AdminLoadError message={t("loadError")} />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            {subs && (
              <>
                <KpiTile label={t("activeSubs")} value={String(subs.total)} />
                <KpiTile label={t("cancelling")} value={String(subs.cancelling)} tone={subs.cancelling > 0 ? "warning" : undefined} />
              </>
            )}
            {purchases && (
              <>
                <KpiTile label={t("tabPurchases")} value={String(purchases.total)} />
                <KpiTile label={t("revenue")} value={formatEuro(purchases.revenueCents, locale)} />
              </>
            )}
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
              {subs && (
                <DataTable
                  caption={t("tabSubs")}
                  rows={subs.rows}
                  rowKey={(r) => r.id}
                  rowHref={(r) => href({ sel: r.id })}
                  selectedKey={searchParams.sel}
                  empty={<EmptyState icon={Repeat} title={t("emptySubsTitle")} description={t("emptySubsText")} />}
                  columns={[
                    {
                      key: "user",
                      header: t("colUser"),
                      width: "minmax(0,1.6fr)",
                      cell: (r) => (
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{formatDisplayName(r.user)}</span>
                          <span className="block truncate text-xs text-ink-faint">@{r.user.username}</span>
                        </span>
                      ),
                    },
                    { key: "plan", header: t("colPlan"), hideOnMobile: true, cell: (r) => <Badge variant="premium">{r.plan?.name ?? r.membershipType}</Badge> },
                    {
                      key: "status",
                      header: t("colStatus"),
                      width: "120px",
                      cell: (r) =>
                        r.status === "PAST_DUE" ? (
                          <StatusBadge tone="danger" label={t("statusPastDue")} />
                        ) : r.cancelDate ? (
                          <StatusBadge tone="warning" label={t("statusCancelling")} />
                        ) : (
                          <StatusBadge tone="success" label={t("statusActive")} />
                        ),
                    },
                    {
                      key: "renewal",
                      header: t("colRenewal"),
                      width: "110px",
                      hideOnMobile: true,
                      cell: (r) => <span className="tabular-nums text-ink-muted">{r.renewalDate ? formatDate(r.renewalDate, locale) : "—"}</span>,
                    },
                    {
                      key: "source",
                      header: t("colSource"),
                      width: "90px",
                      hideOnMobile: true,
                      cell: (r) => <span className="text-ink-muted">{r.stripeSubscriptionId ? t("sourceStripe") : t("sourceManual")}</span>,
                    },
                  ]}
                />
              )}
              {purchases && (
                <DataTable
                  caption={t("tabPurchases")}
                  rows={purchases.rows}
                  rowKey={(r) => r.id}
                  rowHref={(r) => href({ sel: r.id })}
                  selectedKey={searchParams.sel}
                  empty={<EmptyState icon={Receipt} title={t("emptyPurchasesTitle")} description={t("emptyPurchasesText")} />}
                  columns={[
                    {
                      key: "user",
                      header: t("colUser"),
                      width: "minmax(0,1.4fr)",
                      cell: (r) => (
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{formatDisplayName(r.user)}</span>
                          <span className="block truncate text-xs text-ink-faint">@{r.user.username}</span>
                        </span>
                      ),
                    },
                    {
                      key: "product",
                      header: t("colProduct"),
                      width: "minmax(0,1.4fr)",
                      hideOnMobile: true,
                      cell: (r) => (
                        <span className="block truncate">
                          <span className="text-ink">{r.product}</span>
                          <span className="ml-2 text-xs text-ink-faint">{r.kind === "membership" ? t("kindMembership") : t("kindMod")}</span>
                        </span>
                      ),
                    },
                    { key: "amount", header: t("colAmount"), width: "100px", align: "right", cell: (r) => formatEuro(r.amountCents, locale) },
                    {
                      key: "status",
                      header: t("colStatus"),
                      width: "110px",
                      cell: (r) => (r.refunded ? <StatusBadge tone="neutral" label={t("statusRefunded")} /> : <StatusBadge tone="success" label={t("statusPaid")} />),
                    },
                    {
                      key: "date",
                      header: t("colDate"),
                      width: "100px",
                      hideOnMobile: true,
                      cell: (r) => <span className="tabular-nums text-ink-muted">{formatDate(r.createdAt, locale)}</span>,
                    },
                  ]}
                />
              )}
              <Pagination
                className="mt-6"
                page={(subs ?? purchases)!.page}
                pages={(subs ?? purchases)!.pages}
                hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined, sel: undefined })}
              />
            </div>

            <div className="xl:sticky xl:top-6">
              {selectedSub ? (
                <DetailPanel title={t("detail")}>
                  <dl className="divide-y divide-line">
                    <DetailRow label={t("colUser")}>{formatDisplayName(selectedSub.user)} · @{selectedSub.user.username}</DetailRow>
                    <DetailRow label={t("colPlan")}>{selectedSub.plan?.name ?? selectedSub.membershipType}</DetailRow>
                    <DetailRow label={t("since")}>{formatDate(selectedSub.createdAt, locale)}</DetailRow>
                    <DetailRow label={t("colRenewal")}>{selectedSub.renewalDate ? formatDate(selectedSub.renewalDate, locale) : "—"}</DetailRow>
                    {selectedSub.cancelDate && <DetailRow label={t("cancelAt")}>{formatDate(selectedSub.cancelDate, locale)}</DetailRow>}
                    <DetailRow label={t("subscriptionId")}>
                      <span className="mono-id break-all">{selectedSub.stripeSubscriptionId ?? t("sourceManual")}</span>
                    </DetailRow>
                  </dl>
                  {canManage && (
                    <div className="mt-4 space-y-2">
                      <SubscriptionActions
                        userId={selectedSub.userId}
                        username={selectedSub.user.username}
                        viaStripe={!!selectedSub.stripeSubscriptionId}
                        cancelling={!!selectedSub.cancelDate}
                      />
                      <p className="meta text-ink-faint">{t("auditNote")}</p>
                    </div>
                  )}
                  <Button size="sm" variant="ghost" className="mt-3" asChild>
                    <Link href={`/${locale}/admin/users/${selectedSub.userId}`}>{t("openUser")}</Link>
                  </Button>
                </DetailPanel>
              ) : selectedPurchase ? (
                <DetailPanel title={t("detail")}>
                  <dl className="divide-y divide-line">
                    <DetailRow label={t("colUser")}>{formatDisplayName(selectedPurchase.user)} · @{selectedPurchase.user.username}</DetailRow>
                    <DetailRow label={t("colProduct")}>{selectedPurchase.product}</DetailRow>
                    <DetailRow label={t("colAmount")}>{formatEuro(selectedPurchase.amountCents, locale)}</DetailRow>
                    <DetailRow label={t("colDate")}>{formatDate(selectedPurchase.createdAt, locale)}</DetailRow>
                    <DetailRow label={t("paymentId")}>
                      <span className="mono-id break-all">{selectedPurchase.stripePaymentId ?? "—"}</span>
                    </DetailRow>
                  </dl>
                  <div className="mt-4 space-y-2">
                    {selectedPurchase.refunded ? (
                      <StatusBadge tone="neutral" label={t("statusRefunded")} />
                    ) : !selectedPurchase.stripePaymentId?.startsWith("pi_") ? (
                      <p className="text-xs text-ink-muted">{t("noRefund")}</p>
                    ) : (
                      canRefund && (
                        <>
                          <RefundAction
                            kind={selectedPurchase.kind}
                            purchaseId={selectedPurchase.id}
                            username={selectedPurchase.user.username}
                            amountLabel={formatEuro(selectedPurchase.amountCents, locale)}
                          />
                          <p className="meta text-ink-faint">{t("auditNote")}</p>
                        </>
                      )
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="mt-3" asChild>
                    <Link href={`/${locale}/admin/users/${selectedPurchase.user.id}`}>{t("openUser")}</Link>
                  </Button>
                </DetailPanel>
              ) : (
                <EmptyState title={t("selectTitle")} description={t("selectText")} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
