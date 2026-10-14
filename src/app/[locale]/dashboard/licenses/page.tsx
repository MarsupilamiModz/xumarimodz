"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Key } from "lucide-react";
import { redeemLicense, getUserLicenses } from "@/actions/licenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, SectionCard } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDate } from "@/lib/format-locale";

type Activation = {
  id: string;
  createdAt: Date;
  ipHash: string | null;
  licenseKey: {
    productType: string;
    status: string;
    mod: { title: string; slug: string } | null;
  };
};

const TONE: Record<string, StatusTone> = {
  ACTIVE: "success",
  REDEEMED: "info",
  PAUSED: "pending",
  EXPIRED: "warning",
  REVOKED: "neutral",
};

export default function LicensesPage() {
  const locale = useLocale();
  const t = useTranslations("ecosystem");
  const td = useTranslations("dashboard");
  const tl = useTranslations("licenses");
  const ta = useTranslations("accountPages.licenses");
  const appToast = useAppToast();
  const [key, setKey] = useState("");
  const [activations, setActivations] = useState<Activation[] | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getUserLicenses().then((r) => {
      setActivations(r.success ? (r.data as Activation[]) : []);
    });
  }, []);

  return (
    <div className="max-w-3xl">
      <PageHeader title={td("licenses")} description={tl("subtitle")} />

      <div className="space-y-6">
        <SectionCard title={tl("redeem")} description={ta("redeemText")}>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!key) return;
              startTransition(async () => {
                const r = await redeemLicense(key);
                if (r.success) {
                  appToast.created(r.data.mod?.title ?? r.data.productType);
                  setKey("");
                  const refreshed = await getUserLicenses();
                  if (refreshed.success) setActivations(refreshed.data as Activation[]);
                } else appToast.error(r.error);
              });
            }}
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <label htmlFor="license-key" className="label-text">
                {ta("keyLabel")}
              </label>
              <Input
                id="license-key"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder={tl("placeholder")}
                className="font-mono"
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={pending || !key}>
              {t("redeemKey")}
            </Button>
          </form>
        </SectionCard>

        <section aria-labelledby="licenses-list">
          <h2 id="licenses-list" className="section-title mb-4">
            {t("myLicenses")}
          </h2>
          {activations === null ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <DataTable
              caption={t("myLicenses")}
              rows={activations}
              rowKey={(a) => a.id}
              empty={<EmptyState icon={Key} title={ta("emptyTitle")} description={ta("emptyText")} />}
              columns={[
                {
                  key: "product",
                  header: ta("colProduct"),
                  width: "minmax(0,2fr)",
                  cell: (a) => (
                    <span className="block truncate font-medium text-ink">
                      {a.licenseKey.mod?.title ?? a.licenseKey.productType}
                    </span>
                  ),
                },
                {
                  key: "date",
                  header: ta("colActivated"),
                  width: "130px",
                  hideOnMobile: true,
                  cell: (a) => <span className="text-ink-muted">{formatDate(a.createdAt, locale)}</span>,
                },
                {
                  key: "status",
                  header: ta("colStatus"),
                  width: "130px",
                  cell: (a) => (
                    <StatusBadge
                      tone={TONE[a.licenseKey.status] ?? "neutral"}
                      label={ta.has(`status.${a.licenseKey.status}`) ? ta(`status.${a.licenseKey.status}`) : a.licenseKey.status}
                    />
                  ),
                },
              ]}
            />
          )}
        </section>
      </div>
    </div>
  );
}
