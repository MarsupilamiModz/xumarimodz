"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input, controlClassName } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { submitPartnerApplication } from "@/actions/applications";
import type { PartnerFormField } from "@/lib/partner-form-config";

const KNOWN_MAPS = new Set([
  "creatorName",
  "username",
  "email",
  "discord",
  "youtubeUrl",
  "twitchUrl",
  "tiktokUrl",
  "instagramUrl",
  "xUrl",
  "websiteUrl",
  "audienceSize",
  "country",
  "whyPartner",
  "message",
  "promotionStrategy",
]);

export function PartnerApplicationForm({
  fields,
  userEmail,
  username,
  applicationId,
}: {
  fields: PartnerFormField[];
  userEmail: string;
  username: string;
  applicationId?: string;
}) {
  const t = useTranslations("publicPages.becomePartner");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const defaults = { username, email: userEmail };

  return (
    <SectionCard title={applicationId ? t("updateTitle") : undefined} description={applicationId ? t("updateText") : undefined}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const payload: Record<string, unknown> = { applicationId };
            const customResponses: Record<string, string | boolean> = {};

            for (const field of fields) {
              const raw = fd.get(field.id);
              if (field.type === "checkbox") {
                const checked = raw === "on";
                if (field.mapsTo && KNOWN_MAPS.has(field.mapsTo)) {
                  payload[field.mapsTo] = checked;
                } else {
                  customResponses[field.id] = checked;
                }
                continue;
              }
              const value = typeof raw === "string" ? raw.trim() : "";
              if (field.mapsTo && KNOWN_MAPS.has(field.mapsTo)) {
                payload[field.mapsTo] = value || undefined;
              } else if (value) {
                customResponses[field.id] = value;
              }
            }

            startTransition(async () => {
              const r = await submitPartnerApplication({
                applicationId,
                creatorName: (payload.creatorName as string) ?? "",
                username: (payload.username as string) ?? username,
                email: (payload.email as string) ?? userEmail,
                discord: payload.discord as string | undefined,
                youtubeUrl: payload.youtubeUrl as string | undefined,
                twitchUrl: payload.twitchUrl as string | undefined,
                tiktokUrl: payload.tiktokUrl as string | undefined,
                instagramUrl: payload.instagramUrl as string | undefined,
                xUrl: payload.xUrl as string | undefined,
                websiteUrl: payload.websiteUrl as string | undefined,
                audienceSize: payload.audienceSize as string | undefined,
                country: payload.country as string | undefined,
                whyPartner: payload.whyPartner as string | undefined,
                promotionStrategy: payload.promotionStrategy as string | undefined,
                message: payload.message as string | undefined,
                customResponses,
              });
              if (r.success) {
                toast({ title: applicationId ? "toast.updated" : "toast.applicationSubmitted" });
                router.refresh();
              } else toast({ title: r.error, variant: "destructive" });
            });
          }}
        >
          {fields.map((field) => {
            const defaultValue = field.mapsTo
              ? defaults[field.mapsTo as keyof typeof defaults]
              : undefined;
            const id = `pa-${field.id}`;

            if (field.type === "checkbox") {
              return (
                <label key={field.id} className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name={field.id} required={field.required} className="h-4 w-4 rounded-sm border-line-control accent-violet" />
                  {field.label}
                </label>
              );
            }

            return (
              <div key={field.id} className="space-y-1.5">
                <label htmlFor={id} className="label-text">
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <Textarea id={id} name={field.id} placeholder={field.placeholder ?? undefined} rows={3} required={field.required} />
                ) : field.type === "select" ? (
                  <select id={id} name={field.id} required={field.required} className={cn(controlClassName, "h-9")} defaultValue="">
                    <option value="" disabled>
                      {field.placeholder ?? t("selectPlaceholder")}
                    </option>
                    {(field.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={id}
                    name={field.id}
                    type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
                    placeholder={field.placeholder ?? undefined}
                    defaultValue={defaultValue}
                    required={field.required}
                  />
                )}
              </div>
            );
          })}
          <Button type="submit" disabled={pending}>
            {applicationId ? t("resubmit") : t("submit")}
          </Button>
        </form>
    </SectionCard>
  );
}
