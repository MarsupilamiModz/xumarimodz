import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listCommissionRules, listPayouts } from "@/actions/admin/commissions";
import { getPayoutRules, holdbackCutoff, nextPayoutDate } from "@/lib/payout-rules";
import { formatDate, formatEuro } from "@/lib/format-locale";
import { formatDisplayName } from "@/lib/display-name";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CommissionEntries, MarkPaidButton, NewRuleForm, PayoutRulesForm, RuleToggle } from "@/components/admin/commissions-board";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import type { Locale } from "@/i18n/config";

const PAYOUT_TONE: Record<string, StatusTone> = { PENDING: "warning", PROCESSING: "pending", PAID: "success", FAILED: "danger", CANCELLED: "neutral" };

export default async function AdminCommissionsPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const [t, tr] = await Promise.all([getTranslations("admin.cm"), getTranslations("status.role")]);

  const rules = await getPayoutRules();
  const cutoff = holdbackCutoff(rules);
  const since30 = new Date(Date.now() - 30 * 86_400_000);

  const [rulesResult, payoutsResult, entries, openSum, eligibleSum, processingSum, paid30] = await Promise.all([
    listCommissionRules(),
    listPayouts(),
    prisma.commissionEntry.findMany({
      where: { status: "PENDING", payoutId: null },
      orderBy: { createdAt: "asc" },
      take: 300,
      select: { id: true, source: true, amountCents: true, createdAt: true, user: { select: { username: true, displayName: true } } },
    }),
    prisma.commissionEntry.aggregate({ where: { status: "PENDING", payoutId: null }, _sum: { amountCents: true }, _count: true }),
    prisma.commissionEntry.aggregate({ where: { status: "PENDING", payoutId: null, createdAt: { lte: cutoff } }, _sum: { amountCents: true } }),
    prisma.payout.aggregate({ where: { status: "PROCESSING" }, _sum: { amountCents: true } }),
    prisma.payout.aggregate({ where: { status: "PAID", paidAt: { gte: since30 } }, _sum: { amountCents: true } }),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label={t("open")} value={formatEuro(openSum._sum.amountCents ?? 0, locale)} hint={`${openSum._count}`} />
        <KpiTile label={t("eligible")} value={formatEuro(eligibleSum._sum.amountCents ?? 0, locale)} />
        <KpiTile label={t("processing")} value={formatEuro(processingSum._sum.amountCents ?? 0, locale)} />
        <KpiTile label={t("paid30")} value={formatEuro(paid30._sum.amountCents ?? 0, locale)} />
      </div>
      <p className="meta">{t("nextPayout", { date: formatDate(nextPayoutDate(rules), locale) })}</p>

      <CommissionEntries
        locale={locale}
        entries={entries.map((e) => ({
          id: e.id,
          name: formatDisplayName(e.user),
          source: e.source,
          amountCents: e.amountCents,
          createdAt: e.createdAt.toISOString(),
          eligible: e.createdAt <= cutoff,
          heldUntil: new Date(e.createdAt.getTime() + rules.holdbackDays * 86_400_000).toISOString(),
        }))}
      />

      <section className="rounded-lg border border-line bg-raised" aria-labelledby="cm-payouts">
        <h2 id="cm-payouts" className="section-title flex h-12 items-center border-b border-line px-4">{t("payouts")}</h2>
        {!payoutsResult.success || payoutsResult.data.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">{t("noPayouts")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {payoutsResult.data.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                <span className="min-w-0">
                  <span className="font-medium text-ink">{formatDisplayName(p.user)}</span>
                  <span className="meta ml-2 tabular-nums">{formatDate(p.createdAt, locale)}</span>
                  {p.reference && <span className="mono-id ml-2 text-ink-faint">{p.reference}</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums text-ink">{formatEuro(p.amountCents, locale)}</span>
                  <StatusBadge tone={PAYOUT_TONE[p.status] ?? "neutral"} label={t(`ps.${p.status}`)} />
                  {(p.status === "PROCESSING" || p.status === "PENDING") && (
                    <MarkPaidButton id={p.id} name={formatDisplayName(p.user)} amount={formatEuro(p.amountCents, locale)} />
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-raised p-4" aria-labelledby="cm-payout-rules">
          <h2 id="cm-payout-rules" className="section-title mb-3">{t("payoutRules")}</h2>
          <PayoutRulesForm initial={rules} />
        </section>

        <section className="rounded-lg border border-line bg-raised" aria-labelledby="cm-share">
          <h2 id="cm-share" className="section-title flex h-12 items-center border-b border-line px-4">{t("shareRules")}</h2>
          {rulesResult.success && rulesResult.data.length > 0 && (
            <table className="w-full text-[13px]">
              <caption className="sr-only">{t("shareRules")}</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th scope="col" className="px-4 py-2 font-medium">{t("colRule")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("colShare")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("colTarget")}</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">{t("colActive")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rulesResult.data.map((r) => (
                  <tr key={r.id} className="hover:bg-row-hover">
                    <td className="px-4 py-2">
                      <span className="text-ink">{r.name}</span>
                      <span className="meta block">{t(`src.${r.source}`)}</span>
                    </td>
                    <td className="px-4 py-2 tabular-nums text-ink-muted">{r.type === "FIXED" ? formatEuro(r.value, locale) : `${r.value} %`}</td>
                    <td className="px-4 py-2 text-ink-muted">{r.targetRole ? tr(r.targetRole) : t("all")}</td>
                    <td className="px-4 py-2 text-right">
                      <RuleToggle id={r.id} name={r.name} active={r.isActive} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="border-t border-line p-4">
            <h3 className="label-text mb-3 text-ink-muted">{t("newRule")}</h3>
            <NewRuleForm />
          </div>
        </section>
      </div>
    </div>
  );
}
