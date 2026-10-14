"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Rocket, ExternalLink, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResolvedHostingPartner } from "@/lib/hosting/resolve";

type Props = {
  partner: ResolvedHostingPartner;
  modId?: string;
  collectionId?: string;
  gameId?: string;
  variant?: "inline" | "sidebar";
};

export function HostingServerCta({
  partner,
  modId,
  collectionId,
  gameId,
  variant = "inline",
}: Props) {
  const t = useTranslations("sharedUi.hosting");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const trackClick = () => {
    void fetch("/api/hosting/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId: partner.partnerId,
        modId,
        collectionId,
        gameId,
        context: variant === "sidebar" ? "SIDEBAR" : "CTA",
      }),
    });
  };

  const startServer = () => {
    setError(null);
    startTransition(async () => {
      trackClick();
      try {
        const res = await fetch("/api/hosting/provision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modId, collectionId }),
        });
        const data = (await res.json()) as { redirectUrl?: string; error?: string };
        if (!res.ok || !data.redirectUrl) {
          setError(data.error ?? t("startFailed"));
          return;
        }
        window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
      } catch {
        window.open(partner.affiliateUrl, "_blank", "noopener,noreferrer");
      }
    });
  };

  const openAffiliate = () => {
    trackClick();
    window.open(partner.affiliateUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section className={`rounded-lg border border-line bg-raised p-5 ${variant === "sidebar" ? "" : "mt-6"}`}>
      <h2 className="section-title mb-3 flex items-center gap-2">
        <Rocket className="h-4 w-4 text-ink-muted" aria-hidden />
        {t("ctaTitle")}
      </h2>
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">{partner.description || t("ctaText")}</p>
        {partner.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={partner.logoUrl} alt={partner.name} className="h-8 object-contain" />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending} onClick={startServer}>
            <Server className="h-4 w-4" aria-hidden />
            {t("startServer")}
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={openAffiliate}>
            <ExternalLink className="mr-1 h-4 w-4" aria-hidden />
            {partner.name}
          </Button>
        </div>
        {partner.oneClickEnabled ? <p className="meta">{t("oneClick")}</p> : null}
        {error ? <p className="text-xs text-danger" role="alert">{error}</p> : null}
      </div>
    </section>
  );
}
