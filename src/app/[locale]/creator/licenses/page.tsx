"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createLicense } from "@/actions/admin/licenses";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { PageHeader, SectionCard } from "@/components/ui/page-header";
import { useAppToast } from "@/hooks/use-app-toast";

export default function CreatorLicensesPage() {
  const t = useTranslations("ecosystem");
  const tp = useTranslations("creatorPages.licenses");
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [generatedKey, setGeneratedKey] = useState("");

  return (
    <div className="max-w-lg">
      <PageHeader level="h2" title={t("licenses")} description={tp("description")} />
      <div className="space-y-6">
        <SectionCard title={tp("formTitle")}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const r = await createLicense({
                  productType: "mod",
                  modId: fd.get("modId") as string,
                  label: fd.get("label") as string,
                  maxActivations: Number(fd.get("maxActivations") || 1),
                  expiresAt: (fd.get("expiresAt") as string) || undefined,
                });
                if (r.success && r.data?.key) {
                  setGeneratedKey(r.data.key);
                  appToast.created();
                } else if (!r.success) appToast.error(r.error);
              });
            }}
          >
            <div>
              <label htmlFor="license-mod-id" className="label-text mb-1.5 block text-ink-muted">
                {tp("modId")}
              </label>
              <Input id="license-mod-id" name="modId" required />
            </div>
            <div>
              <label htmlFor="license-label" className="label-text mb-1.5 block text-ink-muted">
                {tp("label")}
              </label>
              <Input id="license-label" name="label" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="license-max" className="label-text mb-1.5 block text-ink-muted">
                  {tp("maxActivations")}
                </label>
                <Input id="license-max" name="maxActivations" type="number" defaultValue={1} min={1} max={100} />
              </div>
              <div>
                <label htmlFor="license-expires" className="label-text mb-1.5 block text-ink-muted">
                  {tp("expiresAt")}
                </label>
                <Input id="license-expires" name="expiresAt" type="datetime-local" />
              </div>
            </div>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {t("generateKey")}
            </Button>
          </form>
        </SectionCard>

        {generatedKey && (
          <SectionCard
            title={tp("generatedTitle")}
            description={tp("generatedHint")}
            action={<CopyButton value={generatedKey} label={t("copy")} copiedLabel={t("copied")} />}
          >
            <p className="mono-id break-all rounded-md bg-elevated p-3 text-sm text-ink" aria-live="polite">
              {generatedKey}
            </p>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
