"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Megaphone, Plus } from "lucide-react";
import { createAnnouncement, deleteAnnouncement, updateAnnouncement } from "@/actions/admin/announcements";
import { ANNOUNCEMENT_CHANNELS, ANNOUNCEMENT_KINDS, type AnnouncementChannel, type AnnouncementKind } from "@/lib/announcement-targeting";
import { AnnouncementBar } from "@/components/announcements/announcement-bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDateTime } from "@/lib/format-locale";
import { cn } from "@/lib/utils";

export type EditorAnnouncement = {
  id: string;
  title: string;
  content: string;
  link: string | null;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
  kind: AnnouncementKind;
  channels: AnnouncementChannel[];
  audience: string[];
};

const AUDIENCES = ["everyone", "users", "premium", "creators", "partners", "team"] as const;

/** ISO → Wert für <input type="datetime-local"> in lokaler Zeit. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Draft = Omit<EditorAnnouncement, "id" | "startsAt" | "endsAt"> & { startsAt: string; endsAt: string };

const EMPTY: Draft = { title: "", content: "", link: "", isActive: true, startsAt: "", endsAt: "", kind: "news", channels: ["website"], audience: ["everyone"] };

export function AnnouncementsEditor({ locale, items }: { locale: string; items: EditorAnnouncement[] }) {
  const t = useTranslations("admin.an2");
  const tk = useTranslations("common.announcementKind");
  const router = useRouter();
  const appToast = useAppToast();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const kindLabels = useMemo(() => Object.fromEntries(ANNOUNCEMENT_KINDS.map((k) => [k, tk(k)])) as Record<AnnouncementKind, string>, [tk]);

  function edit(a: EditorAnnouncement | null) {
    setEditingId(a?.id ?? null);
    setDraft(
      a
        ? { title: a.title, content: a.content, link: a.link ?? "", isActive: a.isActive, startsAt: toLocalInput(a.startsAt), endsAt: toLocalInput(a.endsAt), kind: a.kind, channels: a.channels, audience: a.audience }
        : EMPTY
    );
  }

  function toggleIn<T extends string>(list: T[], value: T, on: boolean) {
    return on ? Array.from(new Set([...list, value])) : list.filter((v) => v !== value);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: draft.title.trim(),
      content: draft.content.trim(),
      link: draft.link?.trim() ?? "",
      isActive: draft.isActive,
      startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : undefined,
      endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : "",
      kind: draft.kind,
      channels: draft.channels.length ? draft.channels : (["website"] as AnnouncementChannel[]),
      visibilityTargets: draft.audience.length ? draft.audience : ["everyone"],
    };
    startTransition(async () => {
      const r = editingId ? await updateAnnouncement(editingId, payload) : await createAnnouncement({ ...payload, endsAt: payload.endsAt || undefined });
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      appToast.saved(t("saved"));
      if (!editingId) edit(null);
      router.refresh();
    });
  }

  function remove() {
    if (!editingId) return;
    const id = editingId;
    startTransition(async () => {
      const r = await deleteAnnouncement(id);
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      setConfirmDelete(false);
      edit(null);
      appToast.deleted(t("deleted"));
      router.refresh();
    });
  }

  const now = Date.now();
  const stateOf = (a: EditorAnnouncement) => {
    if (!a.isActive) return { tone: "neutral" as const, label: t("stOff") };
    if (new Date(a.startsAt).getTime() > now) return { tone: "pending" as const, label: t("stScheduled") };
    if (a.endsAt && new Date(a.endsAt).getTime() <= now) return { tone: "neutral" as const, label: t("stEnded") };
    return { tone: "success" as const, label: t("stLive") };
  };

  const preview = draft.title.trim() || draft.content.trim()
    ? [{ id: "preview", title: draft.title.trim(), content: draft.content.trim(), link: draft.link?.trim() || null, kind: draft.kind }]
    : [];

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-lg border border-line bg-raised" aria-labelledby={`${uid}-list`}>
        <div className="flex h-12 items-center justify-between border-b border-line px-4">
          <h2 id={`${uid}-list`} className="section-title">{t("list")}</h2>
          <Button size="sm" variant="outline" onClick={() => edit(null)}>
            <Plus className="h-4 w-4" aria-hidden />
            {t("new")}
          </Button>
        </div>
        {items.length === 0 ? (
          <EmptyState className="m-4" icon={Megaphone} title={t("emptyTitle")} description={t("emptyText")} />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((a) => {
              const st = stateOf(a);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => edit(a)}
                    aria-current={editingId === a.id ? "true" : undefined}
                    className={cn("flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors duration-fast", editingId === a.id ? "bg-violet-soft" : "hover:bg-row-hover")}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-ink">{a.title}</span>
                      <span className="meta block truncate">
                        {tk(a.kind)} · {a.channels.map((c) => t(`channel.${c}`)).join(", ")} ·{" "}
                        {t("range", { start: formatDateTime(a.startsAt, locale), end: a.endsAt ? formatDateTime(a.endsAt, locale) : t("open") })}
                      </span>
                    </span>
                    <StatusBadge tone={st.tone} label={st.label} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="space-y-4">
        <section className="rounded-lg border border-line bg-raised p-4" aria-labelledby={`${uid}-editor`}>
          <h2 id={`${uid}-editor`} className="section-title mb-4">{editingId ? t("editor") : t("new")}</h2>
          <form onSubmit={save} className="space-y-4">
            <ChipTabs label={t("kind")} value={draft.kind} options={ANNOUNCEMENT_KINDS.map((k) => ({ value: k, label: tk(k) }))} onChange={(v) => setDraft((d) => ({ ...d, kind: v as AnnouncementKind }))} />
            <div>
              <label htmlFor={`${uid}-title`} className="label-text mb-1.5 block text-ink-muted">{t("titleLabel")}</label>
              <Input id={`${uid}-title`} value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} required minLength={2} maxLength={120} />
            </div>
            <div>
              <label htmlFor={`${uid}-content`} className="label-text mb-1.5 block text-ink-muted">{t("content")}</label>
              <Textarea id={`${uid}-content`} value={draft.content} onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))} required minLength={2} maxLength={5000} rows={3} />
            </div>
            <div>
              <label htmlFor={`${uid}-link`} className="label-text mb-1.5 block text-ink-muted">{t("link")}</label>
              <Input id={`${uid}-link`} type="url" value={draft.link ?? ""} onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))} placeholder="https://" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-start`} className="label-text mb-1.5 block text-ink-muted">{t("startsAt")}</label>
                <Input id={`${uid}-start`} type="datetime-local" value={draft.startsAt} onChange={(e) => setDraft((d) => ({ ...d, startsAt: e.target.value }))} />
              </div>
              <div>
                <label htmlFor={`${uid}-end`} className="label-text mb-1.5 block text-ink-muted">{t("endsAt")}</label>
                <Input id={`${uid}-end`} type="datetime-local" value={draft.endsAt} min={draft.startsAt || undefined} onChange={(e) => setDraft((d) => ({ ...d, endsAt: e.target.value }))} />
              </div>
            </div>
            <fieldset>
              <legend className="label-text mb-1.5 text-ink-muted">{t("channels")}</legend>
              <div className="flex flex-wrap gap-4">
                {ANNOUNCEMENT_CHANNELS.map((c) => (
                  <Checkbox key={c} checked={draft.channels.includes(c)} onCheckedChange={(on) => setDraft((d) => ({ ...d, channels: toggleIn(d.channels, c, on) }))} label={t(`channel.${c}`)} />
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="label-text mb-1.5 text-ink-muted">{t("audience")}</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {AUDIENCES.map((a) => (
                  <Checkbox key={a} checked={draft.audience.includes(a)} onCheckedChange={(on) => setDraft((d) => ({ ...d, audience: toggleIn(d.audience, a, on) }))} label={t(`aud.${a}`)} />
                ))}
              </div>
            </fieldset>
            <Checkbox checked={draft.isActive} onCheckedChange={(v) => setDraft((d) => ({ ...d, isActive: v }))} label={t("active")} />
            <div className="flex flex-wrap justify-between gap-2">
              {editingId ? (
                <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirmDelete(true)}>
                  {t("delete")}
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={pending || draft.channels.length === 0}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {editingId ? t("save") : t("create")}
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-line bg-raised p-4" aria-labelledby={`${uid}-preview`}>
          <h2 id={`${uid}-preview`} className="section-title mb-3">{t("preview")}</h2>
          {preview.length ? (
            <AnnouncementBar items={preview} kindLabels={kindLabels} moreLabel={t("more")} />
          ) : (
            <p className="text-sm text-ink-muted">{t("previewEmpty")}</p>
          )}
          <p className="meta mt-3 text-ink-faint">{t("appDiscordNote")}</p>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deleteTitle", { title: draft.title })}
        description={t("deleteText")}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={pending}
        onConfirm={remove}
      />
    </div>
  );
}
