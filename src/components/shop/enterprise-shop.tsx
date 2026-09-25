"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";
import { submitShopProductOrder, startShopProductCheckout } from "@/actions/shop";
import { AddToCartButton } from "@/components/shop/cart-controls";
import { useAppToast } from "@/hooks/use-app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";
import { CoverPlaceholder } from "@/components/ui/cover-placeholder";
import { ShopPrice } from "@/components/shop/shop-price";
import type { ShopFormFieldType, ShopPricingMode } from "@prisma/client";

type Product = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  pricingMode: ShopPricingMode;
  priceCents: number;
  thumbnailUrl: string | null;
  coverImageUrl: string | null;
  bannerImageUrl: string | null;
  videoUrl: string | null;
  customType: { name: string; slug: string } | null;
  shopCategory: { name: string; slug: string } | null;
  formFields: {
    id: string;
    fieldType: ShopFormFieldType;
    label: string;
    placeholder: string | null;
    helpText: string | null;
    required: boolean;
    options: unknown;
  }[];
  media: { mediaType: string; url: string; alt: string | null }[];
};

const selectClass =
  "h-10 w-full rounded-md border border-line-control bg-elevated px-3 text-sm text-ink transition-colors duration-fast hover:border-ink-faint";
const labelClass = "text-sm font-semibold text-ink";

export function ShopProductOrderPage({
  product,
  locale,
  isLoggedIn = true,
}: {
  product: Product;
  locale: string;
  isLoggedIn?: boolean;
}) {
  const t = useTranslations("shop");
  const tp = useTranslations("shop.product");
  const appToast = useAppToast();
  const router = useRouter();
  const formId = useId();
  const [pending, startTransition] = useTransition();
  const [files, setFiles] = useState<File[]>([]);

  const hero = product.bannerImageUrl ?? product.coverImageUrl ?? product.thumbnailUrl;
  const gallery = product.media.filter((m) => m.mediaType === "GALLERY" || m.mediaType === "EXAMPLE");
  const isQuoteProduct = product.pricingMode === "QUOTE" || !product.priceCents;

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped].slice(0, 10));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const discord = String(fd.get("discord") ?? "").trim();

    startTransition(async () => {
      if (!isQuoteProduct) {
        // TODO(backend): Zustimmung zu AGB und vorzeitigem Beginn serverseitig mit Zeitstempel speichern.
        const r = await startShopProductCheckout(
          product.slug,
          locale,
          discord,
          typeof window !== "undefined" ? window.location.origin : undefined
        );
        if (!r.success) {
          appToast.error(r.error);
          return;
        }
        if (r.data.checkoutUrl) {
          window.location.href = r.data.checkoutUrl;
          return;
        }
        appToast.error(tp("checkoutUnavailable"));
        return;
      }

      fd.set("productSlug", product.slug);
      fd.set("clientOrigin", typeof window !== "undefined" ? window.location.origin : "");
      files.forEach((f) => fd.append("order_files", f));

      const r = await submitShopProductOrder(fd, locale);
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      appToast.saved();
      router.push(`/${locale}/dashboard/orders/${r.data.orderId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="relative aspect-[21/9] overflow-hidden rounded-xl bg-elevated">
        {hero ? (
          <SafeImage src={hero} alt="" fill className="object-cover" sizes="(max-width: 1440px) 100vw, 1344px" priority />
        ) : (
          <CoverPlaceholder name={product.name} />
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {product.customType && <Badge variant="outline">{product.customType.name}</Badge>}
              {product.shopCategory && <Badge variant="secondary">{product.shopCategory.name}</Badge>}
            </div>
            <h1 className="h1-display mt-3">{product.name}</h1>
            {product.shortDescription && <p className="mt-3 text-ink-muted md:text-lg">{product.shortDescription}</p>}
          </div>
          {product.description && (
            <div className="max-w-3xl whitespace-pre-wrap leading-7 text-ink-muted">{product.description}</div>
          )}
          {gallery.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((m, i) => (
                <div key={i} className="relative aspect-video overflow-hidden rounded-md bg-elevated">
                  <SafeImage src={m.url} alt={m.alt ?? ""} fill className="object-cover" sizes="(max-width: 640px) 50vw, 300px" />
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-xl border border-line bg-raised p-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]">
          <ShopPrice
            priceCents={product.priceCents}
            pricingMode={product.pricingMode}
            locale={locale}
            className="block text-[28px] font-extrabold tabular-nums text-ink"
          />
          {!isQuoteProduct && <p className="meta mt-1">{t("vatNote")}</p>}

          {!isLoggedIn ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-ink-muted">{tp("signInToOrder")}</p>
              <Button className="w-full" asChild>
                <Link href={`/${locale}/login?redirect=/${locale}/shop/${product.slug}`}>{tp("signIn")}</Link>
              </Button>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={submit}>
              {isQuoteProduct &&
                product.formFields.map((field) => {
                  const id = `${formId}-${field.id}`;
                  const name = `field_${field.id}`;
                  return (
                    <div key={field.id} className="space-y-1.5">
                      {field.fieldType !== "CHECKBOX" && (
                        <label htmlFor={id} className={labelClass}>
                          {field.label}
                          {field.required && (
                            <span className="ml-1 text-danger" aria-label={tp("required")}>
                              *
                            </span>
                          )}
                        </label>
                      )}
                      {field.fieldType === "TEXTAREA" ? (
                        <Textarea id={id} name={name} placeholder={field.placeholder ?? undefined} required={field.required} rows={3} />
                      ) : field.fieldType === "DROPDOWN" || field.fieldType === "RADIO" ? (
                        <select id={id} name={name} required={field.required} className={selectClass}>
                          <option value="">{tp("select")}</option>
                          {(Array.isArray(field.options) ? field.options : []).map((opt) => (
                            <option key={String(opt)} value={String(opt)}>
                              {String(opt)}
                            </option>
                          ))}
                        </select>
                      ) : field.fieldType === "CHECKBOX" ? (
                        <label htmlFor={id} className="flex items-start gap-2 text-sm text-ink">
                          <input id={id} type="checkbox" name={name} required={field.required} className="mt-0.5 h-4 w-4 accent-violet" />
                          {field.placeholder ?? field.label}
                        </label>
                      ) : field.fieldType === "DATE" ? (
                        <Input id={id} type="date" name={name} required={field.required} />
                      ) : field.fieldType === "IMAGE_UPLOAD" || field.fieldType === "FILE_UPLOAD" ? (
                        <Input id={id} type="file" name={name} multiple accept=".png,.jpg,.jpeg,.webp,.zip,.pdf" />
                      ) : (
                        <Input id={id} name={name} placeholder={field.placeholder ?? undefined} required={field.required} />
                      )}
                      {field.helpText && <p className="meta">{field.helpText}</p>}
                    </div>
                  );
                })}

              {isQuoteProduct && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  className="rounded-lg border border-dashed border-line-control p-4 text-sm"
                >
                  <label htmlFor={`${formId}-files`} className="flex items-center gap-2 font-semibold text-ink">
                    <Upload className="h-4 w-4 text-ink-muted" aria-hidden />
                    {tp("filesTitle")}
                  </label>
                  <p className="meta mt-1">{tp("filesHint")}</p>
                  <Input
                    id={`${formId}-files`}
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.webp,.zip,.rar,.7z,.psd,.pdf"
                    className="mt-3"
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 10))}
                  />
                  {files.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                      {files.map((f) => (
                        <li key={f.name} className="tabular-nums">
                          {f.name} ({Math.round(f.size / 1024)} KB)
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {!isQuoteProduct && <p className="meta">{tp("afterPayment")}</p>}

              <div className="space-y-1.5">
                <label htmlFor={`${formId}-discord`} className={labelClass}>{tp("discord")}</label>
                <Input id={`${formId}-discord`} name="discord" autoComplete="off" />
              </div>

              {!isQuoteProduct && (
                <div className="space-y-3 border-t border-line pt-4">
                  <label className="flex items-start gap-2.5 text-sm text-ink">
                    <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-4 w-4 shrink-0 accent-violet" />
                    <span>
                      {tp("acceptTerms")}{" "}
                      <Link href={`/${locale}/legal/terms`} className="link" target="_blank">
                        {tp("termsLink")}
                      </Link>
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 text-sm text-ink">
                    <input type="checkbox" name="digitalConsent" required className="mt-0.5 h-4 w-4 shrink-0 accent-violet" />
                    <span>
                      {tp("digitalConsent")}{" "}
                      <Link href={`/${locale}/legal/withdrawal`} className="link" target="_blank">
                        {tp("withdrawalLink")}
                      </Link>
                    </span>
                  </label>
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {pending ? tp("sending") : isQuoteProduct ? tp("requestQuote") : tp("orderPaid")}
              </Button>
            </form>
          )}
          {!isQuoteProduct && (
            <div className="mt-3">
              <AddToCartButton slug={product.slug} locale={locale} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
