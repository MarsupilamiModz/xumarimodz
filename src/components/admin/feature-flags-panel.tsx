"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/ui/page-header";
import { saveOwnerFeatureFlags } from "@/actions/admin/feature-flags";
import {
  FEATURE_FLAG_LABELS,
  type FeatureFlagKey,
  type FeatureFlags,
} from "@/lib/feature-flags-shared";
import { useAppToast } from "@/hooks/use-app-toast";

export function FeatureFlagsPanel({ initial }: { initial: FeatureFlags }) {
  const t = useTranslations("admin.ownerFeatures");
  const router = useRouter();
  const appToast = useAppToast();
  const [flags, setFlags] = useState(initial);
  const [pending, startTransition] = useTransition();

  const toggle = (key: FeatureFlagKey, enabled: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: enabled }));
  };

  const save = () => {
    startTransition(async () => {
      const r = await saveOwnerFeatureFlags(flags);
      if (r.success) {
        appToast.saved();
        router.refresh();
      } else appToast.error(r.error);
    });
  };

  return (
    <SectionCard title={t("cardTitle")} description={t("cardText")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(FEATURE_FLAG_LABELS) as FeatureFlagKey[]).map((key) => (
          <label
            key={key}
            className="flex items-center justify-between gap-3 rounded-md border border-line px-4 py-3"
          >
            <span className="text-sm font-medium text-ink">{t(`flag.${key}`)}</span>
            <Switch checked={flags[key]} onCheckedChange={(v) => toggle(key, v)} />
          </label>
        ))}
      </div>
      <Button className="mt-4" disabled={pending} aria-busy={pending} onClick={save}>
        {t("save")}
      </Button>
    </SectionCard>
  );
}
