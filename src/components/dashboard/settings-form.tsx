"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { uploadAvatar, updateProfile, applyForCreator, updatePassword } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AvatarCropUpload } from "@/components/upload/avatar-crop-upload";
import { dispatchProfileAvatarUpdated } from "@/lib/profile-media-events";
import { bustAvatarUrl } from "@/lib/avatar-url";
import { formatDisplayName } from "@/lib/display-name";
import { toast } from "@/hooks/use-toast";

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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <UserAvatar src={avatarUrl} name={formatDisplayName(user)} className="h-16 w-16" />
            <div>
              <AvatarCropUpload
                label="Upload avatar"
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
            <div>
              <label className="text-sm">Display name</label>
              <Input name="displayName" defaultValue={user.displayName ?? ""} className="mt-1" />
            </div>
            <div>
              <label className="text-sm">Bio</label>
              <Textarea name="bio" defaultValue={user.bio ?? ""} rows={3} className="mt-1" />
            </div>
            <div>
              <label className="text-sm">Language</label>
              <select name="locale" defaultValue={user.locale} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm">
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">{formatDisplayName(user)}</p>
            <Button type="submit" disabled={pending}>Save profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Security</CardTitle></CardHeader>
        <CardContent>
          <Link href={`/${locale}/dashboard/security`} className="text-sm text-violet-bright hover:underline">
            Security & 2FA →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Password</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
          />
          <Button
            variant="outline"
            disabled={pending || password.length < 8}
            onClick={() =>
              startTransition(async () => {
                const r = await updatePassword(password);
                if (r.success) {
                  toast({ title: "toast.passwordUpdated" });
                  setPassword("");
                } else toast({ title: "toast.error", description: r.error, variant: "destructive" });
              })
            }
          >
            Update password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Discord</CardTitle></CardHeader>
        <CardContent>
          {user.discordId ? (
            <p className="text-sm text-ink-muted">Discord connected</p>
          ) : (
            <Button variant="outline" asChild>
              <a href={`/api/auth/discord?locale=${locale}`}>Connect Discord</a>
            </Button>
          )}
        </CardContent>
      </Card>

      {!user.hasCreatorProfile && user.role === "USER" && (
        <Card>
          <CardHeader><CardTitle>Become a Creator</CardTitle></CardHeader>
          <CardContent>
            <Button
             
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
              Apply as Creator
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
