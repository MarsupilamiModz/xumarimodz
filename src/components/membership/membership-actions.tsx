"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { formatCreditsFromCents } from "@/lib/credits";
import { formatDate } from "@/lib/format-locale";

type Purchase = {
  id: string;
  amountCents: number;
  stripePaymentId: string | null;
  createdAt: Date;
  plan: { name: string; slug: string };
};

export function MembershipActions({
  locale,
  purchases,
}: {
  locale: string;
  purchases: Purchase[];
}) {
  const t = useTranslations("accountPages.subscription");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function openReceipt(paymentId: string) {
    setLoadingId(paymentId);
    try {
      const res = await fetch(`/api/stripe/receipt?paymentIntent=${paymentId}`);
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/${locale}/premium`}>{t("upgrade")}</Link>
        </Button>
      </div>

      {purchases.length > 0 && (
        <div className="space-y-2">
          <h3 className="label-text">{t("historyTitle")}</h3>
          <DataTable
            caption={t("historyTitle")}
            rows={purchases}
            rowKey={(p) => p.id}
            columns={[
              {
                key: "plan",
                header: t("colPlan"),
                width: "minmax(0,2fr)",
                cell: (p) => <span className="block truncate font-medium text-ink">{p.plan.name}</span>,
              },
              {
                key: "amount",
                header: t("colAmount"),
                width: "120px",
                align: "right",
                cell: (p) => formatCreditsFromCents(p.amountCents, locale),
              },
              {
                key: "date",
                header: t("colDate"),
                width: "110px",
                hideOnMobile: true,
                cell: (p) => <span className="text-ink-muted">{formatDate(p.createdAt, locale)}</span>,
              },
              {
                key: "receipt",
                header: t("colReceipt"),
                width: "110px",
                align: "right",
                cell: (p) =>
                  p.stripePaymentId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingId === p.stripePaymentId}
                      aria-label={t("receiptLabel", { plan: p.plan.name })}
                      onClick={() => openReceipt(p.stripePaymentId!)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      {t("receipt")}
                    </Button>
                  ) : null,
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
