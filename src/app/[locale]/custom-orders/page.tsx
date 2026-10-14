"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { createCustomOrderFromForm } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Input, controlClassName } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, SectionCard } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function CustomOrdersPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const t = useTranslations("orders");
  const tp = useTranslations("publicPages.customOrders");
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  const orderTypes = [
    "redux_minimap",
    "custom_hud",
    "ui_package",
    "commission",
  ] as const;

  const field = (id: string, label: string, control: React.ReactNode, hint?: string) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="label-text">
        {label}
      </label>
      {control}
      {hint && <p className="meta">{hint}</p>}
    </div>
  );

  return (
    <div className="page-section">
      <div className="max-w-2xl">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <p className="-mt-3 mb-6 text-sm">
          <Link href={`/${locale}/login`} className="link underline">
            {t("signInHint")}
          </Link>
        </p>
        <SectionCard>
          {submitted ? (
            <p className="text-sm text-ink-muted" role="status">
              {t("submitted")}{" "}
              <Link href={`/${locale}/dashboard/orders`} className="link underline">
                {tp("toOrders")}
              </Link>
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await createCustomOrderFromForm(form);
                  if (res.success) {
                    setSubmitted(true);
                    toast({ title: t("submitted") });
                    router.push(`/${locale}/dashboard/orders/${res.data.id}`);
                  } else {
                    toast({
                      title: res.error === "Unauthorized" ? t("signInHint") : "toast.error",
                      description: res.error,
                      variant: "destructive",
                    });
                  }
                });
              }}
              className="space-y-4"
            >
              {field("co-title", tp("projectTitle"), <Input id="co-title" name="title" required minLength={5} />)}
              {field(
                "co-type",
                tp("orderType"),
                <select id="co-type" name="orderType" className={cn(controlClassName, "h-9")} required>
                  {orderTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(`types.${type}`)}
                    </option>
                  ))}
                </select>
              )}
              {field(
                "co-description",
                tp("description"),
                <Textarea id="co-description" name="description" rows={6} placeholder={tp("descriptionPlaceholder")} required minLength={20} />
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {field("co-budget", tp("budget"), <Input id="co-budget" name="budget" type="number" min={0} step={100} />)}
                {field("co-discord", tp("discord"), <Input id="co-discord" name="discord" />)}
              </div>
              {field(
                "co-references",
                tp("references"),
                <Input
                  id="co-references"
                  name="references"
                  type="file"
                  multiple
                  accept="image/*,.pdf,.zip,.rar,.7z,.psd,.png,.jpg,.jpeg,.webp"
                />,
                tp("referencesHint")
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {t("submit")}
              </Button>
            </form>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
