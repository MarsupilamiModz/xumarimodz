"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FolderTree, GraduationCap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page-header";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatNumber } from "@/lib/format-locale";
import {
  saveTutorial,
  saveTutorialCategory,
  deleteTutorial,
  seedDefaultTutorialCategories,
  uploadTutorialVideo,
} from "@/actions/admin/tutorials";
import type { TutorialLevel, TutorialStatus, TutorialType } from "@prisma/client";

type AdminData = Extract<
  Awaited<ReturnType<typeof import("@/actions/admin/tutorials").getTutorialsAdminData>>,
  { success: true }
>["data"];

const TYPES = ["YOUTUBE", "VIDEO", "ARTICLE", "MIXED"] as const;

export function TutorialsAdminPanel({ data }: { data: AdminData }) {
  const t = useTranslations("admin.tutorialsAdmin");
  const tLevel = useTranslations("common.tutorialsPage.level");
  const tToast = useTranslations("toast");
  const locale = useLocale();
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState("tutorials");
  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    type: "YOUTUBE" as TutorialType,
    level: "BEGINNER" as TutorialLevel,
    status: "DRAFT" as TutorialStatus,
    categoryId: "",
    youtubeUrl: "",
    videoUrl: "",
    videoFileKey: "",
  });
  const [uploading, setUploading] = useState(false);
  const [catName, setCatName] = useState("");
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);

  const label = (id: string, text: string) => <label htmlFor={id} className="label-text">{text}</label>;
  const statusLabel = (s: string) => (t.has(`status.${s}`) ? t(`status.${s}`) : s);
  const typeLabel = (s: string) => (t.has(`type.${s}`) ? t(`type.${s}`) : s);

  return (
    <div className="space-y-6">
      <ChipTabs
        label={t("tabs")}
        value={tab}
        onChange={setTab}
        options={[
          { value: "tutorials", label: t("tabTutorials"), count: data.tutorials.length },
          { value: "categories", label: t("tabCategories"), count: data.categories.length },
        ]}
      />

      {tab === "tutorials" ? (
        <>
          <SectionCard title={t("createTitle")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                {label("tut-title", t("titleLabel"))}
                <Input id="tut-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                {label("tut-type", t("typeLabel"))}
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as TutorialType }))}>
                  <SelectTrigger id="tut-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((ty) => (
                      <SelectItem key={ty} value={ty}>{typeLabel(ty)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                {label("tut-level", t("levelLabel"))}
                <Select value={form.level} onValueChange={(v) => setForm((f) => ({ ...f, level: v as TutorialLevel }))}>
                  <SelectTrigger id="tut-level"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">{tLevel("BEGINNER")}</SelectItem>
                    <SelectItem value="INTERMEDIATE">{tLevel("INTERMEDIATE")}</SelectItem>
                    <SelectItem value="ADVANCED">{tLevel("ADVANCED")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                {label("tut-category", t("categoryLabel"))}
                <Select value={form.categoryId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v === "none" ? "" : v }))}>
                  <SelectTrigger id="tut-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noCategory")}</SelectItem>
                    {data.categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                {label("tut-status", t("statusLabel"))}
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as TutorialStatus }))}>
                  <SelectTrigger id="tut-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">{statusLabel("DRAFT")}</SelectItem>
                    <SelectItem value="PUBLISHED">{statusLabel("PUBLISHED")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                {label("tut-youtube", t("youtubeLabel"))}
                <Input id="tut-youtube" type="url" placeholder="https://youtube.com/…" value={form.youtubeUrl} onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                {label("tut-video", t("videoUrlLabel"))}
                <Input id="tut-video" value={form.videoUrl} onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))} className="mono-id" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                {label("tut-file", t("videoFileLabel"))}
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="tut-file"
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                    disabled={uploading}
                    className="max-w-sm"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      const fd = new FormData();
                      fd.set("file", file);
                      void uploadTutorialVideo(fd)
                        .then((r) => {
                          if (r.success) {
                            setForm((f) => ({
                              ...f,
                              videoUrl: r.data.videoUrl,
                              videoFileKey: r.data.fileKey,
                              type: f.type === "ARTICLE" ? "MIXED" : f.type === "YOUTUBE" ? "VIDEO" : f.type,
                            }));
                            appToast.raw({ title: tToast("videoUploaded") });
                          } else appToast.error(r.error);
                        })
                        .finally(() => setUploading(false));
                    }}
                  />
                  {uploading ? <span role="status" className="meta">{t("uploading")}</span> : null}
                  {form.videoUrl && !uploading ? <StatusBadge tone="success" label={t("videoReady")} /> : null}
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                {label("tut-description", t("descriptionLabel"))}
                <Textarea id="tut-description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                {label("tut-content", t("contentLabel"))}
                <Textarea id="tut-content" className="min-h-[120px]" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Button
                  disabled={pending || !form.title}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await saveTutorial(form);
                      if (r.success) {
                        appToast.raw({ title: tToast("tutorialSaved") });
                        router.refresh();
                      } else appToast.error(r.error);
                    })
                  }
                >
                  {t("save")}
                </Button>
              </div>
            </div>
          </SectionCard>

          <section aria-labelledby="tutorials-list-heading" className="space-y-3">
            <h2 id="tutorials-list-heading" className="section-title">{t("listTitle")}</h2>
            <DataTable
              caption={t("listTitle")}
              rows={data.tutorials}
              rowKey={(tut) => tut.id}
              empty={<EmptyState icon={GraduationCap} title={t("emptyTitle")} description={t("emptyText")} />}
              columns={[
                { key: "title", header: t("colTitle"), width: "minmax(0,2fr)", cell: (tut) => <span className="font-medium">{tut.title}</span> },
                { key: "type", header: t("colType"), hideOnMobile: true, cell: (tut) => typeLabel(tut.type) },
                {
                  key: "status",
                  header: t("colStatus"),
                  width: "150px",
                  cell: (tut) => (
                    <StatusBadge tone={tut.status === "PUBLISHED" ? "success" : "neutral"} label={statusLabel(tut.status)} />
                  ),
                },
                { key: "views", header: t("colViews"), align: "right", width: "90px", hideOnMobile: true, cell: (tut) => formatNumber(tut.viewCount, locale) },
                {
                  key: "actions",
                  header: t("colActions"),
                  align: "right",
                  width: "80px",
                  cell: (tut) => (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-danger"
                      disabled={pending}
                      aria-label={t("deleteLabel", { title: tut.title })}
                      onClick={() => setDeleting({ id: tut.id, title: tut.title })}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  ),
                },
              ]}
            />
          </section>
        </>
      ) : (
        <>
          <SectionCard title={t("categoriesTitle")}>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!catName) return;
                startTransition(async () => {
                  await saveTutorialCategory({ name: catName });
                  setCatName("");
                  router.refresh();
                });
              }}
            >
              <div className="min-w-[200px] flex-1 space-y-1.5">
                {label("tut-cat-name", t("categoryName"))}
                <Input id="tut-cat-name" value={catName} onChange={(e) => setCatName(e.target.value)} />
              </div>
              <Button type="submit" size="sm" disabled={!catName || pending}>{t("add")}</Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => startTransition(async () => { await seedDefaultTutorialCategories(); router.refresh(); })}
              >
                {t("seedDefaults")}
              </Button>
            </form>
          </SectionCard>
          {data.categories.length === 0 ? (
            <EmptyState icon={FolderTree} title={t("noCategoriesTitle")} description={t("noCategoriesText")} />
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-raised text-sm">
              {data.categories.map((c) => (
                <li key={c.id} className="px-4 py-3 text-ink">{c.name}</li>
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle", { title: deleting?.title ?? "" })}
        description={t("deleteText")}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          startTransition(async () => {
            await deleteTutorial(deleting.id);
            setDeleting(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
