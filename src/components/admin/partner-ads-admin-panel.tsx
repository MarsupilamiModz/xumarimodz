"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { KpiTile } from "@/components/ui/kpi-tile";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useAppToast } from "@/hooks/use-app-toast";
import { saveHostingPartner, deleteHostingPartner } from "@/actions/admin/partner-ads";
import { formatNumber } from "@/lib/format-locale";

type Partner = {
  id: string;
  name: string;
  description: string | null;
  affiliateUrl: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  totalClicks: number;
  isGlobal: boolean;
};

type Analytics = {
  clicksToday: number;
  clicks7d: number;
  clicks30d: number;
};

const EMPTY_FORM = { id: "", name: "", description: "", affiliateUrl: "", websiteUrl: "", bannerUrl: "" };

export function PartnerAdsAdminPanel({
  partners,
  analytics,
  locale,
}: {
  partners: Partner[];
  analytics: Analytics;
  locale: string;
}) {
  const t = useTranslations("admin.ui.partnerAds");
  const tp = useTranslations("admin.partnerAdsAdmin");
  const uid = useId();
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleting, setDeleting] = useState<Partner | null>(null);

  const save = () => {
    startTransition(async () => {
      const r = await saveHostingPartner({
        id: form.id || undefined,
        name: form.name,
        description: form.description,
        affiliateUrl: form.affiliateUrl,
        websiteUrl: form.websiteUrl || undefined,
        logoUrl: form.bannerUrl || undefined,
        isGlobal: partners.length === 0,
      });
      if (r.success) {
        appToast.saved();
        setForm(EMPTY_FORM);
        router.refresh();
      } else appToast.error(r.error);
    });
  };

  const fields: { key: "name" | "affiliateUrl" | "websiteUrl" | "bannerUrl"; label: string; mono?: boolean }[] = [
    { key: "name", label: t("partnerNamePlaceholder") },
    { key: "affiliateUrl", label: t("affiliateLinkPlaceholder"), mono: true },
    { key: "websiteUrl", label: t("websiteLinkPlaceholder"), mono: true },
    { key: "bannerUrl", label: t("bannerUrlPlaceholder"), mono: true },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiTile label={t("clicksTodayLabel")} value={formatNumber(analytics.clicksToday, locale)} />
        <KpiTile label={t("clicks7dLabel")} value={formatNumber(analytics.clicks7d, locale)} />
        <KpiTile label={t("clicks30dLabel")} value={formatNumber(analytics.clicks30d, locale)} />
      </div>

      <SectionCard
        title={form.id ? tp("editTitle", { name: form.name }) : t("hostingPartnerTitle")}
        action={
          form.id ? (
            <Button size="sm" variant="ghost" onClick={() => setForm(EMPTY_FORM)}>
              {tp("cancelEdit")}
            </Button>
          ) : undefined
        }
      >
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {fields.map((f) => (
            <div key={f.key}>
              <label htmlFor={`${uid}-${f.key}`} className="label-text mb-1.5 block">{f.label}</label>
              <Input
                id={`${uid}-${f.key}`}
                className={f.mono ? "font-mono" : undefined}
                value={form[f.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-description`} className="label-text mb-1.5 block">{t("descriptionPlaceholder")}</label>
            <Textarea id={`${uid}-description`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <Button type="submit" disabled={pending || !form.name || !form.affiliateUrl}>
              {t("save")}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title={tp("listTitle")}>
        {partners.length === 0 ? (
          <EmptyState icon={Handshake} title={tp("emptyTitle")} description={tp("emptyText")} />
        ) : (
          <ul className="divide-y divide-line">
            {partners.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                    {p.name}
                    {p.isGlobal && <StatusBadge tone="info" label={tp("global")} />}
                  </p>
                  <p className="mono-id max-w-md truncate">{p.affiliateUrl}</p>
                  <p className="meta tabular-nums">{formatNumber(p.totalClicks, locale)} {t("clicksSuffix")}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setForm({ id: p.id, name: p.name, description: p.description ?? "", affiliateUrl: p.affiliateUrl, websiteUrl: p.websiteUrl ?? "", bannerUrl: p.logoUrl ?? "" })}
                  >
                    {t("edit")}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => setDeleting(p)}>
                    {t("delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={tp("deleteTitle", { name: deleting?.name ?? "" })}
        description={tp("deleteText")}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          const id = deleting.id;
          startTransition(async () => {
            await deleteHostingPartner(id);
            setDeleting(null);
            appToast.deleted();
            router.refresh();
          });
        }}
      />
    </div>
  );
}
