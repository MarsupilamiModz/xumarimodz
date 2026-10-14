"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ServerCog } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAppToast } from "@/hooks/use-app-toast";
import { saveCreatorHostingSettings } from "@/actions/creator/hosting";

type Props = {
  profile: {
    hostingAffiliateLink: string | null;
    hostingDescription: string | null;
    hostingBannerUrl: string | null;
    hostingPartnerEnabled: boolean;
  };
  platformSettings: {
    allowCreatorLinks: boolean;
    creatorOnlyGlobal: boolean;
    revenueShareEnabled: boolean;
    creatorHostingShareBps: number;
    platformHostingShareBps: number;
  };
};

const labelClass = "label-text mb-1.5 block text-ink-muted";

export function CreatorHostingPanel({ profile, platformSettings }: Props) {
  const t = useTranslations("creatorPages.hosting");
  const tc = useTranslations("common");
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    hostingAffiliateLink: profile.hostingAffiliateLink ?? "",
    hostingDescription: profile.hostingDescription ?? "",
    hostingBannerUrl: profile.hostingBannerUrl ?? "",
    hostingPartnerEnabled: profile.hostingPartnerEnabled,
  });

  if (platformSettings.creatorOnlyGlobal) {
    return <EmptyState icon={ServerCog} title={t("globalOnlyTitle")} description={t("globalOnlyText")} />;
  }

  return (
    <SectionCard
      title={t("sectionTitle")}
      className="max-w-2xl"
      action={!platformSettings.allowCreatorLinks ? <StatusBadge tone="warning" label={t("linksDisabled")} /> : undefined}
    >
      <div className="space-y-4">
        <label className="flex items-center gap-3 text-sm text-ink">
          <Switch
            checked={form.hostingPartnerEnabled}
            onCheckedChange={(v) => setForm((f) => ({ ...f, hostingPartnerEnabled: v }))}
          />
          {t("enabled")}
        </label>
        <div>
          <label htmlFor="hosting-link" className={labelClass}>{t("affiliateLink")}</label>
          <Input
            id="hosting-link"
            value={form.hostingAffiliateLink}
            onChange={(e) => setForm((f) => ({ ...f, hostingAffiliateLink: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="hosting-banner" className={labelClass}>{t("bannerUrl")}</label>
          <Input
            id="hosting-banner"
            value={form.hostingBannerUrl}
            onChange={(e) => setForm((f) => ({ ...f, hostingBannerUrl: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="hosting-description" className={labelClass}>{t("hostingDescription")}</label>
          <Textarea
            id="hosting-description"
            value={form.hostingDescription}
            onChange={(e) => setForm((f) => ({ ...f, hostingDescription: e.target.value }))}
          />
        </div>
        {platformSettings.revenueShareEnabled ? (
          <p className="meta tabular-nums">
            {t("revenueShare", {
              creator: (platformSettings.creatorHostingShareBps / 100).toFixed(0),
              platform: (platformSettings.platformHostingShareBps / 100).toFixed(0),
            })}
          </p>
        ) : null}
        <Button
          disabled={pending || !platformSettings.allowCreatorLinks}
          aria-busy={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await saveCreatorHostingSettings(form);
              if (r.success) {
                appToast.saved();
                router.refresh();
              } else appToast.error(r.error);
            })
          }
        >
          {tc("save")}
        </Button>
      </div>
    </SectionCard>
  );
}
