"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page-header";
import { SafeImage } from "@/components/ui/safe-image";
import { AvatarCropUpload } from "@/components/upload/avatar-crop-upload";
import { useAppToast } from "@/hooks/use-app-toast";
import { uploadViaApi, type UploadPurpose } from "@/lib/upload-client";
import { getMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

type StudioProfileUploadProps = {
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  avatarPurpose: UploadPurpose;
  bannerPurpose?: UploadPurpose;
  logoPurpose?: UploadPurpose;
  showBanner?: boolean;
  showLogo?: boolean;
};

export function StudioProfileUpload({
  avatarUrl,
  bannerUrl,
  logoUrl,
  avatarPurpose,
  bannerPurpose,
  logoPurpose,
  showBanner = true,
  showLogo = false,
}: StudioProfileUploadProps) {
  const t = useTranslations("media");
  const ts = useTranslations("sharedTools.studioProfileUpload");
  const appToast = useAppToast();
  const router = useRouter();
  const bannerRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [banner, setBanner] = useState(bannerUrl);
  const [logo, setLogo] = useState(logoUrl);
  const [uploading, setUploading] = useState<"avatar" | "banner" | "logo" | null>(null);
  const [progress, setProgress] = useState(0);

  async function handleUpload(file: File, purpose: UploadPurpose) {
    const kind = purpose.includes("banner") ? "banner" : purpose.includes("logo") ? "logo" : "avatar";
    setUploading(kind);
    setProgress(0);
    try {
      const result = await uploadViaApi({ file, purpose, onProgress: setProgress });
      const url = getMediaUrl(result.url) ?? result.url;
      if (kind === "avatar") setAvatar(url);
      else if (kind === "banner") setBanner(url);
      else setLogo(url);
      appToast.uploaded();
      router.refresh();
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setUploading(null);
      setProgress(0);
    }
  }

  return (
    <SectionCard title={t("profileMedia")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="label-text">{t("avatar")}</p>
          <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border border-line bg-elevated">
            <SafeImage src={avatar} alt="" fill className="object-cover" sizes="96px" fallbackLabel="" />
          </div>
          <AvatarCropUpload
            label={t("uploadAvatar")}
            disabled={uploading === "avatar"}
            onCropped={(file) => handleUpload(file, avatarPurpose)}
          />
        </div>

        {showBanner && bannerPurpose && (
          <div className="space-y-2">
            <p className="label-text">{t("banner")}</p>
            <div className="relative aspect-[3/1] overflow-hidden rounded-lg border border-line bg-elevated">
              <SafeImage src={banner} alt="" fill className="object-cover" sizes="300px" fallbackLabel="" />
            </div>
            <input
              ref={bannerRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file, bannerPurpose);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploading === "banner"}
              onClick={() => bannerRef.current?.click()}
            >
              {uploading === "banner" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
              {t("uploadBanner")}
            </Button>
          </div>
        )}

        {showLogo && logoPurpose && (
          <div className="space-y-2 sm:col-span-2">
            <p className="label-text">{ts("logo")}</p>
            <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-lg border border-line bg-elevated">
              <SafeImage src={logo} alt="" fill className="object-cover" sizes="64px" fallbackLabel="" />
            </div>
            <input
              ref={logoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file, logoPurpose);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="outline" size="sm" disabled={uploading === "logo"} onClick={() => logoRef.current?.click()}>
              {uploading === "logo" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
              {ts("uploadLogo")}
            </Button>
          </div>
        )}
      </div>

      {uploading && (
        <div className="mt-4 space-y-1">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={t("uploading", { progress })}
            className="h-1.5 overflow-hidden rounded-full bg-elevated"
          >
            <div className={cn("h-full bg-violet transition-all duration-200")} style={{ width: `${progress}%` }} />
          </div>
          <p className="meta tabular-nums">{t("uploading", { progress })}</p>
        </div>
      )}
    </SectionCard>
  );
}
