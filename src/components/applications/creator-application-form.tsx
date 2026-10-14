"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatUploadErrorMessage } from "@/lib/upload-errors";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page-header";
import { useR2MultipartUpload } from "@/hooks/use-r2-multipart-upload";
import { submitCreatorApplication } from "@/actions/applications";

/** Eingabefeld mit sichtbarem Label (Barrierefreiheit). */
function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="label-text">
        {label}
      </label>
      {children}
    </div>
  );
}

export function CreatorApplicationForm({ userEmail }: { userEmail: string }) {
  const t = useTranslations("common.cx.creatorApplication");
  const tp = useTranslations("publicPages.becomeCreator");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { upload, progress, uploading } = useR2MultipartUpload();
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);

  async function handlePortfolioUpload(file: File) {
    try {
      const result = await upload({ file, purpose: "creator-portfolio" });
      if (result.url) setPortfolioImages((prev) => [...prev, result.url as string]);
    } catch (err) {
      toast({ title: "toast.uploadFailed", description: formatUploadErrorMessage(err), variant: "destructive" });
    }
  }

  return (
    <SectionCard>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const r = await submitCreatorApplication({
              displayName: fd.get("displayName") as string,
              email: fd.get("email") as string,
              discord: (fd.get("discord") as string) || undefined,
              portfolioUrl: (fd.get("portfolioUrl") as string) || undefined,
              youtubeUrl: (fd.get("youtubeUrl") as string) || undefined,
              twitchUrl: (fd.get("twitchUrl") as string) || undefined,
              tiktokUrl: (fd.get("tiktokUrl") as string) || undefined,
              instagramUrl: (fd.get("instagramUrl") as string) || undefined,
              xUrl: (fd.get("xUrl") as string) || undefined,
              websiteUrl: (fd.get("websiteUrl") as string) || undefined,
              message: (fd.get("message") as string) || undefined,
              portfolioImages,
            });
            if (r.success) {
              toast({ title: "toast.applicationSubmitted" });
              router.refresh();
            } else toast({ title: r.error, variant: "destructive" });
          });
        }}
      >
        <Field id="ca-displayName" label={t("displayNamePlaceholder")}>
          <Input id="ca-displayName" name="displayName" required autoComplete="nickname" />
        </Field>
        <Field id="ca-email" label={tp("email")}>
          <Input id="ca-email" name="email" type="email" defaultValue={userEmail} required autoComplete="email" />
        </Field>
        <Field id="ca-discord" label={t("discordPlaceholder")}>
          <Input id="ca-discord" name="discord" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ca-youtube" label={t("youtubePlaceholder")}>
            <Input id="ca-youtube" name="youtubeUrl" />
          </Field>
          <Field id="ca-twitch" label={t("twitchPlaceholder")}>
            <Input id="ca-twitch" name="twitchUrl" />
          </Field>
          <Field id="ca-tiktok" label={t("tiktokPlaceholder")}>
            <Input id="ca-tiktok" name="tiktokUrl" />
          </Field>
          <Field id="ca-instagram" label={t("instagramPlaceholder")}>
            <Input id="ca-instagram" name="instagramUrl" />
          </Field>
          <Field id="ca-x" label={t("xPlaceholder")}>
            <Input id="ca-x" name="xUrl" />
          </Field>
          <Field id="ca-website" label={t("websitePlaceholder")}>
            <Input id="ca-website" name="websiteUrl" />
          </Field>
        </div>
        <Field id="ca-portfolio" label={t("portfolioUrlPlaceholder")}>
          <Input id="ca-portfolio" name="portfolioUrl" />
        </Field>
        <Field id="ca-message" label={t("messagePlaceholder")}>
          <Textarea id="ca-message" name="message" rows={4} />
        </Field>
        <Field id="ca-screenshots" label={t("portfolioScreenshotsLabel")}>
          <Input
            id="ca-screenshots"
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handlePortfolioUpload(f);
            }}
          />
          <p className="meta" aria-live="polite">
            {uploading
              ? t("uploadingProgress", { progress })
              : portfolioImages.length > 0
                ? t("filesAttached", { count: portfolioImages.length })
                : null}
          </p>
        </Field>
        <Button type="submit" disabled={pending || uploading}>
          {t("submit")}
        </Button>
      </form>
    </SectionCard>
  );
}
