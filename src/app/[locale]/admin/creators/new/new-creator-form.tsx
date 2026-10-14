"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createCreatorProfile, searchUsersForCreator } from "@/actions/admin/creators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEVEL_OPTIONS, CREATOR_LEVELS } from "@/lib/creator-levels";
import type { PublisherLevel } from "@prisma/client";
import { useAppToast } from "@/hooks/use-app-toast";

export default function NewCreatorForm({ locale }: { locale: string }) {
  const t = useTranslations("ecosystem");
  const tn = useTranslations("admin.creatorNew");
  const uid = useId();
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");
  const [searched, setSearched] = useState(false);
  const [users, setUsers] = useState<{ id: string; username: string; email: string }[]>([]);
  const [level, setLevel] = useState<PublisherLevel>("VERIFIED");

  const runSearch = () =>
    startTransition(async () => {
      const r = await searchUsersForCreator(search);
      if (r.success) {
        setUsers(r.data);
        setSearched(true);
      } else appToast.error(r.error);
    });

  return (
    <div className="max-w-lg space-y-6">
      <SectionCard title={tn("userTitle")} description={tn("userText")}>
        <div className="space-y-4">
          <div>
            <label htmlFor={`${uid}-search`} className="label-text mb-1.5 block">{t("searchUser")}</label>
            <div className="flex gap-2">
              <Input
                id={`${uid}-search`}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch();
                  }
                }}
              />
              <Button type="button" variant="outline" disabled={pending} onClick={runSearch}>
                {t("search")}
              </Button>
            </div>
          </div>
          {users.length > 0 && (
            <div>
              <label htmlFor={`${uid}-user`} className="label-text mb-1.5 block">{t("selectUser")}</label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id={`${uid}-user`}><SelectValue placeholder={t("selectUser")} /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>@{u.username} · {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {searched && users.length === 0 && <p className="text-sm text-ink-muted" role="status">{tn("noUsers")}</p>}
        </div>
      </SectionCard>

      <SectionCard title={tn("profileTitle")}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!userId) return;
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const r = await createCreatorProfile({
                userId,
                level: level as "VERIFIED" | "TRUSTED" | "ELITE" | "OFFICIAL_PARTNER",
                tagline: fd.get("tagline") as string,
                description: fd.get("description") as string,
                isPublic: fd.get("isPublic") === "on",
                isFeatured: fd.get("isFeatured") === "on",
              });
              if (r.success) {
                appToast.created();
                router.push(`/${locale}/admin/creators/${r.data.id}`);
              } else appToast.error(r.error);
            });
          }}
        >
          <div>
            <label htmlFor={`${uid}-level`} className="label-text mb-1.5 block">{t("creatorLevel")}</label>
            <Select value={level} onValueChange={(v) => setLevel(v as PublisherLevel)}>
              <SelectTrigger id={`${uid}-level`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((l) => (
                  <SelectItem key={l} value={l}>{t(CREATOR_LEVELS[l].labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor={`${uid}-tagline`} className="label-text mb-1.5 block">{t("tagline")}</label>
            <Input id={`${uid}-tagline`} name="tagline" />
          </div>
          <div>
            <label htmlFor={`${uid}-bio`} className="label-text mb-1.5 block">{t("bio")}</label>
            <Textarea id={`${uid}-bio`} name="description" rows={3} />
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-ink">
            <label className="flex items-center gap-2"><input type="checkbox" name="isPublic" className="h-4 w-4 accent-violet" />{t("public")}</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="isFeatured" className="h-4 w-4 accent-violet" />{t("featured")}</label>
          </div>
          <Button type="submit" disabled={pending || !userId}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t("createCreator")}
          </Button>
          {!userId && <p className="meta">{tn("selectFirst")}</p>}
        </form>
      </SectionCard>
    </div>
  );
}
