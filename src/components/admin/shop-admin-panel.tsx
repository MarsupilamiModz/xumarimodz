"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Package, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createShopProduct, updateShopProduct, deleteShopProduct } from "@/actions/admin/shop";
import { useAppToast } from "@/hooks/use-app-toast";
import { CREDITS_PER_EUR } from "@/lib/credits";
import { formatEuro, formatNumber } from "@/lib/format-locale";
import { safeFormOptional, safeFormString, safeStripePriceId } from "@/lib/text";

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  productType: string;
  creditPrice: number;
  priceCents: number;
  creditsAmount: number | null;
  stripePriceId: string | null;
  isFeatured: boolean;
  isActive: boolean;
  salePercent: number;
  sortOrder: number;
  _count?: { purchases: number };
};

const CATEGORIES = ["CREDITS", "MEMBERSHIP", "MODS", "EXCLUSIVE", "BUNDLES", "ACCESS"];
const PRODUCT_TYPES = ["CREDIT_PACK", "MEMBERSHIP", "MOD", "EXCLUSIVE", "BUNDLE", "SUBSCRIPTION", "ACCESS"];
const selectClass = "h-9 w-full rounded-md border border-line-control bg-raised px-3 text-sm text-ink";

function creditsToEuroHint(credits: number, locale: string, t: ReturnType<typeof useTranslations>) {
  const euros = credits / CREDITS_PER_EUR;
  return t("creditsEuroHint", { credits: formatNumber(credits, locale), euro: formatEuro(Math.round(euros * 100), locale) });
}

export function ShopAdminPanel({ products, locale }: { products: Product[]; locale: string }) {
  const t = useTranslations("admin.ui.shopAdmin");
  const tb = useTranslations("admin.shopPage");
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creditsPreview, setCreditsPreview] = useState(0);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const cat = (c: string) => (tb.has(`category.${c}`) ? tb(`category.${c}`) : c);
  const type = (c: string) => (tb.has(`type.${c}`) ? tb(`type.${c}`) : c);

  const field = (id: string, label: string, input: React.ReactNode, className?: string) => (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className="label-text">{label}</label>
      {input}
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionCard title={editing ? t("editProduct") : t("createProduct")} description={t("rateHint")}>
        <form
          key={editing?.id ?? "new"}
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const priceEuro = Number(fd.get("priceEuro") || 0);
            const payload = {
              name: safeFormString(fd, "name"),
              description: safeFormOptional(fd, "description"),
              category: safeFormString(fd, "category") as "CREDITS" | "MEMBERSHIP" | "MODS" | "EXCLUSIVE" | "BUNDLES" | "ACCESS",
              productType: safeFormString(fd, "productType") as "CREDIT_PACK" | "MEMBERSHIP" | "MOD" | "EXCLUSIVE" | "BUNDLE" | "SUBSCRIPTION" | "ACCESS",
              creditPrice: Number(fd.get("creditPrice") || 0),
              priceCents: Math.round(priceEuro * 100),
              creditsAmount: fd.get("creditsAmount") ? Number(fd.get("creditsAmount")) : undefined,
              stripePriceId: safeStripePriceId(fd.get("stripePriceId")),
              isFeatured: fd.get("isFeatured") === "on",
              isActive: fd.get("isActive") === "on",
              salePercent: Number(fd.get("salePercent") || 0),
              sortOrder: Number(fd.get("sortOrder") || 0),
            };
            startTransition(async () => {
              const r = editing
                ? await updateShopProduct(editing.id, payload)
                : await createShopProduct(payload);
              if (r.success) {
                appToast.saved();
                setEditing(null);
                router.refresh();
              } else appToast.error(r.error);
            });
          }}
        >
          {field("shop-name", t("productName"), <Input id="shop-name" name="name" defaultValue={editing?.name} required />)}
          {field(
            "shop-credits",
            t("creditsPlaceholder"),
            <Input
              id="shop-credits"
              name="creditsAmount"
              type="number"
              defaultValue={editing?.creditsAmount ?? ""}
              onChange={(e) => setCreditsPreview(Number(e.target.value) || 0)}
            />
          )}
          {field(
            "shop-price",
            t("priceEuroPlaceholder"),
            <Input
              id="shop-price"
              name="priceEuro"
              type="number"
              step="0.01"
              min={0}
              defaultValue={editing ? (editing.priceCents / 100).toFixed(2) : ""}
            />
          )}
          {field(
            "shop-stripe",
            tb("stripePriceId"),
            <Input id="shop-stripe" name="stripePriceId" defaultValue={editing?.stripePriceId ?? ""} placeholder="price_..." className="mono-id" />
          )}
          {field("shop-credit-price", t("creditPricePlaceholder"), <Input id="shop-credit-price" name="creditPrice" type="number" defaultValue={editing?.creditPrice ?? 0} />)}
          {creditsPreview > 0 && (
            <p className="meta self-end pb-2">{creditsToEuroHint(creditsPreview, locale, t)}</p>
          )}
          {field(
            "shop-category",
            tb("categoryLabel"),
            <select id="shop-category" name="category" defaultValue={editing?.category ?? "CREDITS"} className={selectClass}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{cat(c)}</option>
              ))}
            </select>
          )}
          {field(
            "shop-type",
            tb("typeLabel"),
            <select id="shop-type" name="productType" defaultValue={editing?.productType ?? "CREDIT_PACK"} className={selectClass}>
              {PRODUCT_TYPES.map((c) => (
                <option key={c} value={c}>{type(c)}</option>
              ))}
            </select>
          )}
          {field("shop-sale", t("salePercentPlaceholder"), <Input id="shop-sale" name="salePercent" type="number" defaultValue={editing?.salePercent ?? 0} />)}
          {field("shop-sort", t("sortOrderPlaceholder"), <Input id="shop-sort" name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? 0} />)}
          {field(
            "shop-description",
            t("descriptionPlaceholder"),
            <Textarea id="shop-description" name="description" defaultValue={editing?.description ?? ""} rows={3} />,
            "sm:col-span-2"
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="isFeatured" defaultChecked={editing?.isFeatured} /> {t("featured")}</label>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} /> {t("active")}</label>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={pending}>{editing ? t("save") : t("create")}</Button>
            {editing && <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("cancel")}</Button>}
          </div>
        </form>
      </SectionCard>

      <section aria-labelledby="shop-products-heading" className="space-y-3">
        <h2 id="shop-products-heading" className="section-title">{tb("products")}</h2>
        <DataTable
          caption={tb("products")}
          rows={products}
          rowKey={(p) => p.id}
          selectedKey={editing?.id}
          empty={<EmptyState icon={Package} title={tb("emptyTitle")} description={tb("emptyText")} />}
          columns={[
            {
              key: "name",
              header: tb("colProduct"),
              width: "minmax(0,2fr)",
              cell: (p) => (
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    {p.isFeatured && <StatusBadge tone="info" label={t("featured")} />}
                    {!p.isActive && <StatusBadge tone="neutral" label={t("inactive")} />}
                  </div>
                  {p.stripePriceId && <p className="mono-id mt-0.5 truncate text-ink-faint">{p.stripePriceId}</p>}
                </div>
              ),
            },
            {
              key: "type",
              header: tb("colType"),
              hideOnMobile: true,
              cell: (p) => (
                <span className="text-ink-muted">
                  {cat(p.category)} · {type(p.productType)}
                </span>
              ),
            },
            {
              key: "price",
              header: tb("colPrice"),
              align: "right",
              width: "minmax(0,1.2fr)",
              cell: (p) => (
                <div>
                  <p>{formatEuro(p.priceCents, locale)}</p>
                  {p.creditsAmount ? <p className="meta">{t("creditsAmount", { amount: formatNumber(p.creditsAmount, locale) })}</p> : null}
                  {p.creditPrice > 0 && <p className="meta">{t("creditsInApp", { amount: formatNumber(p.creditPrice, locale) })}</p>}
                </div>
              ),
            },
            {
              key: "sales",
              header: tb("colSales"),
              align: "right",
              width: "100px",
              hideOnMobile: true,
              cell: (p) => t("salesCount", { count: p._count?.purchases ?? 0 }),
            },
            {
              key: "actions",
              header: tb("colActions"),
              align: "right",
              width: "96px",
              cell: (p) => (
                <div className="flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={tb("editProduct", { name: p.name })}
                    onClick={() => {
                      setEditing(p);
                      setCreditsPreview(p.creditsAmount ?? 0);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-danger"
                    disabled={pending}
                    aria-label={tb("deleteProduct", { name: p.name })}
                    onClick={() => setDeleting(p)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </section>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={tb("deleteTitle", { name: deleting?.name ?? "" })}
        description={tb("deleteText")}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          startTransition(async () => {
            const r = await deleteShopProduct(deleting.id);
            if (r.success) {
              setDeleting(null);
              router.refresh();
            } else appToast.error(r.error);
          });
        }}
      />
    </div>
  );
}
