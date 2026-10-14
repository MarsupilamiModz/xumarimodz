"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { uploadAvatar, updateProfile, applyForCreator, updatePassword } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input, controlClassName } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page-header";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AvatarCropUpload } from "@/components/upload/avatar-crop-upload";
import { dispatchProfileAvatarUpdated } from "@/lib/profile-media-events";
import { bustAvatarUrl } from "@/lib/avatar-url";
import { formatDisplayName } from "@/lib/display-name";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type User = {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  locale: string;
  discordId: string | null;
  role: string;
  hasCreatorProfile: boolean;
};

export function SettingsForm({ locale, user }: { locale: string; user: User }) {
  const t = useTranslations("common.cx.settingsForm");
  const ta = useTranslations("accountPages.settings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);

  return (
    <div className="space-y-6">
      <SectionCard title={t("profileTitle")}>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <UserAvatar src={avatarUrl} name={formatDisplayName(user)} className="h-16 w-16" />
            <div>
              <AvatarCropUpload
                label={t("uploadAvatar")}
                onCropped={async (file) => {
                  startTransition(async () => {
                    try {
                      const fd = new FormData();
                      fd.set("avatar", file);
                      const r = await uploadAvatar(fd);
                      if (!r.success) throw new Error(r.error);
                      const resolved = bustAvatarUrl(r.data.url);
                      setAvatarUrl(resolved);
                      dispatchProfileAvatarUpdated({ avatarUrl: resolved });
                      toast({ title: "toast.avatarUpdated" });
                      router.refresh();
                    } catch (err) {
                      toast({
                        title: "toast.error",
                        description: err instanceof Error ? err.message : "toast.uploadFailed",
                        variant: "destructive",
                      });
                    }
                  });
                }}
              />
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const r = await updateProfile({
                  displayName: fd.get("displayName") as string,
                  bio: fd.get("bio") as string,
                  locale: fd.get("locale") as "en" | "de",
                });
                if (r.success) toast({ title: "toast.profileSaved" });
                else toast({ title: "toast.error", description: r.error, variant: "destructive" });
              });
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <label htmlFor="settings-display-name" className="label-text">{t("displayNameLabel")}</label>
              <Input id="settings-display-name" name="displayName" defaultValue={user.displayName ?? ""} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="settings-bio" className="label-text">{t("bioLabel")}</label>
              <Textarea id="settings-bio" name="bio" defaultValue={user.bio ?? ""} rows={3} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="settings-locale" className="label-text">{t("languageLabel")}</label>
              <select
                id="settings-locale"
                name="locale"
                defaultValue={user.locale}
                className={cn(controlClassName, "flex h-9 w-full")}
              >
                <option value="en">{t("languageEnglish")}</option>
                <option value="de">{t("languageGerman")}</option>
              </select>
            </div>
            <p className="meta">{formatDisplayName(user)}</p>
            <Button type="submit" disabled={pending}>{t("saveProfile")}</Button>
          </form>
        </div>
      </SectionCard>

      <SectionCard title={t("securityTitle")}>
        <Link href={`/${locale}/dashboard/security`} className="link text-sm">
          {t("securityLink")}
        </Link>
      </SectionCard>

      <SectionCard title={t("passwordTitle")}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (password.length < 8) return;
            startTransition(async () => {
              const r = await updatePassword(password);
              if (r.success) {
                toast({ title: "toast.passwordUpdated" });
                setPassword("");
              } else toast({ title: "toast.error", description: r.error, variant: "destructive" });
            });
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="settings-password" className="label-text">{ta("passwordLabel")}</label>
            <Input
              id="settings-password"
              type="password"
              placeholder={t("newPasswordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" variant="outline" disabled={pending || password.length < 8}>
            {t("updatePassword")}
          </Button>
        </form>
      </SectionCard>

      <SectionCard title={t("discordTitle")}>
        {user.discordId ? (
          <p className="text-sm text-ink-muted">{t("discordConnected")}</p>
        ) : (
          <Button variant="outline" asChild>
            <a href={`/api/auth/discord?locale=${locale}`}>{t("connectDiscord")}</a>
          </Button>
        )}
      </SectionCard>

      {!user.hasCreatorProfile && user.role === "USER" && (
        <SectionCard title={t("becomeCreatorTitle")}>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await applyForCreator();
                if (r.success) {
                  toast({ title: "toast.creatorProfileCreated" });
                  router.push(`/${locale}/creator`);
                  router.refresh();
                } else toast({ title: "toast.error", description: r.error, variant: "destructive" });
              })
            }
          >
            {t("applyAsCreator")}
          </Button>
        </SectionCard>
      )}
    </div>
  );
}
