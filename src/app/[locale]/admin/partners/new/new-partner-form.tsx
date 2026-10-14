"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createPartnerProfile, searchUsersForPartner } from "@/actions/admin/partners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDisplayName } from "@/lib/display-name";
import { useAppToast } from "@/hooks/use-app-toast";

export default function NewPartnerForm({ locale }: { locale: string }) {
  const t = useTranslations("ecosystem");
  const tb = useTranslations("admin.partnerNew");
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");
  const [searched, setSearched] = useState(false);
  const [users, setUsers] = useState<{ id: string; username: string; email: string; displayName: string | null }[]>([]);

  return (
    <div className="max-w-lg space-y-6">
      <SectionCard title={tb("userStep")} description={tb("userStepText")}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const r = await searchUsersForPartner(search);
              if (r.success) setUsers(r.data);
              setSearched(true);
            });
          }}
        >
          <label htmlFor="partner-user-search" className="sr-only">{t("searchUser")}</label>
          <Input id="partner-user-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchUser")} />
          <Button type="submit" variant="outline" disabled={pending}>
            {t("search")}
          </Button>
        </form>
        {users.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <label htmlFor="partner-user-select" className="label-text">{t("selectUser")}</label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="partner-user-select"><SelectValue placeholder={t("selectUser")} /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {formatDisplayName(u)} · {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {searched && users.length === 0 && !pending && (
          <p className="mt-3 text-sm text-ink-muted">{tb("noUsers")}</p>
        )}
      </SectionCard>

      <SectionCard title={tb("profileStep")}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!userId) return;
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const r = await createPartnerProfile({
                userId,
                tagline: fd.get("tagline") as string,
                description: fd.get("description") as string,
                website: (fd.get("website") as string) || undefined,
                isVerified: fd.get("isVerified") === "on",
                isFeatured: fd.get("isFeatured") === "on",
                isPublic: fd.get("isPublic") === "on",
              });
              if (r.success) {
                appToast.created();
                router.push(`/${locale}/admin/partners/${r.data.id}`);
              } else appToast.error(r.error);
            });
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="new-partner-tagline" className="label-text">{t("tagline")}</label>
            <Input id="new-partner-tagline" name="tagline" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-partner-description" className="label-text">{t("bio")}</label>
            <Textarea id="new-partner-description" name="description" rows={3} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-partner-website" className="label-text">{tb("website")}</label>
            <Input id="new-partner-website" name="website" type="url" placeholder="https://" />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="isPublic" defaultChecked />{t("public")}</label>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="isVerified" />{t("verified")}</label>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="isFeatured" />{t("featured")}</label>
          </div>
          {!userId && <p className="meta">{tb("pickUserFirst")}</p>}
          <Button type="submit" disabled={pending || !userId}>{tb("submit")}</Button>
        </form>
      </SectionCard>
    </div>
  );
}
