"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatUploadErrorMessage } from "@/lib/upload-errors";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useR2MultipartUpload } from "@/hooks/use-r2-multipart-upload";
import { submitCreatorApplication } from "@/actions/applications";

export function CreatorApplicationForm({ userEmail }: { userEmail: string }) {
  const t = useTranslations("common.cx.creatorApplication");
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
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
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
          <Input name="displayName" placeholder={t("displayNamePlaceholder")} required />
          <Input name="email" type="email" defaultValue={userEmail} required />
          <Input name="discord" placeholder={t("discordPlaceholder")} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input name="youtubeUrl" placeholder={t("youtubePlaceholder")} />
            <Input name="twitchUrl" placeholder={t("twitchPlaceholder")} />
            <Input name="tiktokUrl" placeholder={t("tiktokPlaceholder")} />
            <Input name="instagramUrl" placeholder={t("instagramPlaceholder")} />
            <Input name="xUrl" placeholder={t("xPlaceholder")} />
            <Input name="websiteUrl" placeholder={t("websitePlaceholder")} />
          </div>
          <Input name="portfolioUrl" placeholder={t("portfolioUrlPlaceholder")} />
          <Textarea name="message" placeholder={t("messagePlaceholder")} rows={4} />
          <div>
            <label className="text-sm font-medium">{t("portfolioScreenshotsLabel")}</label>
            <Input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handlePortfolioUpload(f);
              }}
            />
            {uploading && <p className="text-xs text-muted-foreground mt-1">{t("uploadingProgress", { progress })}</p>}
            {portfolioImages.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{t("filesAttached", { count: portfolioImages.length })}</p>
            )}
          </div>
          <Button type="submit" disabled={pending || uploading}>
            {t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
