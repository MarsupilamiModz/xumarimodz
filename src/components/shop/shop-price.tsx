import { useTranslations } from "next-intl";
import type { ShopPricingMode } from "@prisma/client";
import { safeIntlNumberFormat } from "@/lib/i18n/safe-locale";

/** Preis eines Shop-Produkts, übersetzt („Ab 9,99 €“, „Individuelles Angebot“). */
export function ShopPrice({
  priceCents,
  pricingMode,
  locale,
  className,
}: {
  priceCents: number;
  pricingMode: ShopPricingMode;
  locale: string;
  className?: string;
}) {
  const t = useTranslations("shop");
  if (pricingMode === "QUOTE" || !priceCents) return <span className={className}>{t("customQuote")}</span>;
  const price = safeIntlNumberFormat(locale, { style: "currency", currency: "EUR" }).format(priceCents / 100);
  if (pricingMode === "STARTING_FROM" || pricingMode === "VARIABLE") {
    return <span className={className}>{t("from", { price })}</span>;
  }
  return <span className={className}>{price}</span>;
}
