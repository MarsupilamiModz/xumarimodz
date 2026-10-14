"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link2 } from "lucide-react";
import {
  createReferralLink,
  toggleReferralLink,
  updateReferralLink,
  deleteReferralLink,
} from "@/actions/admin/referrals";
import { buildReferralRegisterUrl } from "@/lib/referral-url";
import type { getAdminReferrals } from "@/actions/admin/referrals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDateTime, formatNumber } from "@/lib/format-locale";
import type { MembershipTier } from "@prisma/client";

type ReferralData = Extract<
  Awaited<ReturnType<typeof getAdminReferrals>>,
  { success: true }
>["data"];

type ReferralLink = ReferralData["links"][number];

export function ReferralsAdminPanel({ data, locale }: { data: ReferralData; locale: string }) {
  const t = useTranslations("admin.ui.referrals");
  const tb = useTranslations("admin.referralsPage");
  const tTier = useTranslations("admin.ui.membershipManager.tier");
  const router = useRouter();
  const appToast = useAppToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<{ id: string; days: string } | null>(null);
  const [deleting, setDeleting] = useState<ReferralLink | null>(null);

  const field = (id: string, label: string, input: React.ReactNode) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="label-text">{label}</label>
      {input}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("clicksLabel")} value={formatNumber(data.totals.clicks, locale)} />
        <KpiTile label={t("registrationsLabel")} value={formatNumber(data.totals.registrations, locale)} />
        <KpiTile label={t("premiumGrantsLabel")} value={formatNumber(data.totals.signups, locale)} />
        <KpiTile label={t("conversionLabel")} value={`${data.conversionRate} %`} />
      </div>

      <SectionCard title={t("createReferralTitle")}>
        <form
          ref={formRef}
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const r = await createReferralLink({
                code: fd.get("code") as string,
                name: fd.get("name") as string,
                premiumType: (fd.get("premiumType") as MembershipTier) || "PREMIUM_LITE",
                premiumDays: Number(fd.get("premiumDays") || 3),
                maxUses: fd.get("maxUses") ? Number(fd.get("maxUses")) : null,
                trackingEnabled: fd.get("trackingEnabled") === "on",
              });
              if (r.success) {
                appToast.saved();
                formRef.current?.reset();
                router.refresh();
              } else appToast.error(r.error);
            });
          }}
        >
          {field("ref-code", tb("code"), <Input id="ref-code" name="code" placeholder={t("codePlaceholder")} required className="mono-id" />)}
          {field("ref-name", t("campaignNamePlaceholder"), <Input id="ref-name" name="name" required />)}
          {field("ref-days", t("premiumDaysPlaceholder"), <Input id="ref-days" name="premiumDays" type="number" defaultValue={3} min={1} />)}
          {field("ref-max", t("maxUsesPlaceholder"), <Input id="ref-max" name="maxUses" type="number" min={1} />)}
          {field(
            "ref-tier",
            tb("tier"),
            <select
              id="ref-tier"
              name="premiumType"
              defaultValue="PREMIUM_LITE"
              className="h-9 w-full rounded-md border border-line-control bg-raised px-3 text-sm text-ink"
            >
              <option value="PREMIUM_LITE">{tTier("PREMIUM_LITE")}</option>
              <option value="PREMIUM">{tTier("PREMIUM")}</option>
              <option value="PREMIUM_MAX">{tTier("PREMIUM_MAX")}</option>
            </select>
          )}
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
            <input type="checkbox" name="trackingEnabled" defaultChecked /> {t("enableClickTracking")}
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {t("createLink")}
            </Button>
          </div>
        </form>
      </SectionCard>

      <section aria-labelledby="referral-links-heading" className="space-y-3">
        <h2 id="referral-links-heading" className="section-title">{t("referralLinksTitle")}</h2>
        {data.links.length === 0 ? (
          <EmptyState icon={Link2} title={t("noReferralLinks")} description={tb("emptyText")} />
        ) : (
          <ul className="space-y-3">
            {data.links.map((link) => {
              const url = buildReferralRegisterUrl(locale, link.code);
              const isEditing = editing?.id === link.id;
              return (
                <li key={link.id} className="space-y-3 rounded-lg border border-line bg-raised p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{link.name}</p>
                      <p className="mono-id text-ink-muted">{link.code}</p>
                    </div>
                    <StatusBadge tone={link.active ? "success" : "neutral"} label={link.active ? t("statusActive") : t("statusInactive")} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="meta min-w-0 flex-1 break-all">{url}</p>
                    <CopyButton value={url} label={tb("copyLink")} copiedLabel={tb("copied")} />
                  </div>
                  <p className="meta flex flex-wrap gap-x-3 gap-y-1">
                    <span>{tb("reward", { days: link.premiumDays, tier: tTier.has(link.premiumType) ? tTier(link.premiumType) : link.premiumType })}</span>
                    <span>{t("clicksCount", { count: link.clickCount })}</span>
                    <span>{t("usesCount", { count: link.currentUses })}</span>
                    {link.maxUses != null && <span>{t("maxUsesLabel", { max: link.maxUses })}</span>}
                    {link.expiresAt && <span>{t("expiresLabel", { date: formatDateTime(link.expiresAt, locale) })}</span>}
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await toggleReferralLink(link.id, !link.active);
                          if (r.success) router.refresh();
                          else appToast.error(r.error);
                        })
                      }
                    >
                      {link.active ? t("deactivate") : t("activate")}
                    </Button>
                    {isEditing ? (
                      <form
                        className="flex items-end gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const days = Number(editing.days);
                          if (!days) return;
                          startTransition(async () => {
                            const r = await updateReferralLink(link.id, { premiumDays: days });
                            if (r.success) {
                              setEditing(null);
                              router.refresh();
                            } else appToast.error(r.error);
                          });
                        }}
                      >
                        <div className="space-y-1.5">
                          <label htmlFor={`ref-edit-${link.id}`} className="label-text">{t("editDaysPrompt")}</label>
                          <Input
                            id={`ref-edit-${link.id}`}
                            type="number"
                            min={1}
                            autoFocus
                            value={editing.days}
                            onChange={(e) => setEditing({ id: link.id, days: e.target.value })}
                            className="h-[30px] w-24 tabular-nums"
                          />
                        </div>
                        <Button type="submit" size="sm" variant="outline" disabled={pending}>{tb("saveDays")}</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>{tb("cancel")}</Button>
                      </form>
                    ) : (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing({ id: link.id, days: String(link.premiumDays) })}>
                        {t("editDays")}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => setDeleting(link)}>
                      {t("delete")}
                    </Button>
                  </div>
                  {link.signups.length > 0 && (
                    <div className="border-t border-line pt-3">
                      <h3 className="label-text mb-1">{t("recentRegistrations")}</h3>
                      <ul className="meta space-y-1">
                        {link.signups.map((signup) => (
                          <li key={signup.id}>
                            {signup.user.displayName ?? signup.user.username} · <span className="tabular-nums">{formatDateTime(signup.createdAt, locale)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteReferralConfirm", { code: deleting?.code ?? "" })}
        description={tb("deleteText")}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          startTransition(async () => {
            const r = await deleteReferralLink(deleting.id);
            if (r.success) {
              appToast.saved();
              setDeleting(null);
              router.refresh();
            } else appToast.error(r.error);
          });
        }}
      />
    </div>
  );
}
