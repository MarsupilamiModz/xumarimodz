"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { reviewCreatorApplicationAdmin, reviewPartnerApplicationAdmin } from "@/actions/admin/applications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDate } from "@/lib/format-locale";

export type BoardApplication = {
  id: string;
  kind: "creator" | "partner";
  status: "PENDING" | "UNDER_REVIEW" | "NEEDS_CHANGES" | "APPROVED" | "REJECTED";
  name: string;
  username: string;
  email: string;
  discord: string | null;
  createdAt: string;
  message: string | null;
  audience: string | null;
  strategy: string | null;
  links: string[];
  adminNotes: string | null;
};

type Rule = { id: string; name: string; type: string; value: number };

const COLUMNS = [
  { key: "new", label: "colNew", statuses: ["PENDING"] },
  { key: "review", label: "colReview", statuses: ["UNDER_REVIEW", "NEEDS_CHANGES"] },
  { key: "approved", label: "colApproved", statuses: ["APPROVED"] },
  { key: "rejected", label: "colRejected", statuses: ["REJECTED"] },
] as const;

/**
 * Kanban „Neu / In Prüfung / Angenommen / Abgelehnt“. Karten verschieben sich über die Aktionen im Detaildialog
 * (tastaturbedienbar); Annehmen und Ablehnen laufen über eine Bestätigung.
 */
export function ApplicationsBoard({ locale, apps, rules }: { locale: string; apps: BoardApplication[]; rules: Rule[] }) {
  const t = useTranslations("admin.ap");
  const router = useRouter();
  const appToast = useAppToast();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [codes, setCodes] = useState({ creator: "", partner: "", rule: "" });
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null);

  const selected = apps.find((a) => a.id === openId) ?? null;

  function openApp(app: BoardApplication) {
    setOpenId(app.id);
    setNotes(app.adminNotes ?? "");
    setCodes({ creator: "", partner: "", rule: "" });
  }

  function act(action: "approve" | "reject" | "review" | "needs_changes") {
    if (!selected) return;
    const app = selected;
    startTransition(async () => {
      const r =
        app.kind === "creator"
          ? await reviewCreatorApplicationAdmin(app.id, action === "needs_changes" ? "info" : action, notes.trim() || undefined)
          : await reviewPartnerApplicationAdmin(app.id, action, {
              adminNotes: notes.trim() || undefined,
              requiredChanges: action === "needs_changes" ? notes.trim() || undefined : undefined,
              creatorCode: codes.creator.trim() || undefined,
              partnerCode: codes.partner.trim() || undefined,
              commissionRuleId: codes.rule || undefined,
            });
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      setConfirm(null);
      setOpenId(null);
      appToast.updated(t("done"));
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = apps.filter((a) => (col.statuses as readonly string[]).includes(a.status));
          return (
            <section key={col.key} aria-labelledby={`${uid}-${col.key}`} className="flex min-h-40 flex-col rounded-lg border border-line bg-raised">
              <h2 id={`${uid}-${col.key}`} className="section-title flex h-11 items-center justify-between border-b border-line px-3">
                {t(col.label)}
                <span className="rounded-md bg-elevated px-1.5 text-xs tabular-nums text-ink-muted">{items.length}</span>
              </h2>
              {items.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-ink-faint">{t("empty")}</p>
              ) : (
                <ul className="flex flex-col gap-2 p-2">
                  {items.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => openApp(a)}
                        aria-label={t("open", { name: a.name })}
                        className="w-full rounded-md border border-line bg-canvas p-3 text-left transition-colors duration-fast hover:border-line-control"
                      >
                        <span className="block truncate text-[13px] font-semibold text-ink">{a.name}</span>
                        <span className="block truncate text-xs text-ink-faint">@{a.username}</span>
                        {a.message && <span className="mt-1.5 line-clamp-2 block text-xs text-ink-muted">{a.message}</span>}
                        <span className="mt-2 flex items-center justify-between gap-2">
                          <span className="meta tabular-nums">{formatDate(a.createdAt, locale)}</span>
                          {a.status === "NEEDS_CHANGES" && <Badge variant="warning">{t("needsChanges")}</Badge>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <Dialog open={selected !== null} onOpenChange={(o) => !o && !pending && setOpenId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>
                  @{selected.username} · {t("submitted", { date: formatDate(selected.createdAt, locale) })}
                </DialogDescription>
              </DialogHeader>

              <dl className="divide-y divide-line text-[13px]">
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-ink-muted">{t("email")}</dt>
                  <dd className="text-right text-ink">{selected.email}</dd>
                </div>
                {selected.discord && (
                  <div className="flex justify-between gap-3 py-2">
                    <dt className="text-ink-muted">{t("discord")}</dt>
                    <dd className="text-right text-ink">{selected.discord}</dd>
                  </div>
                )}
                {selected.audience && (
                  <div className="flex justify-between gap-3 py-2">
                    <dt className="text-ink-muted">{t("audience")}</dt>
                    <dd className="text-right text-ink">{selected.audience}</dd>
                  </div>
                )}
                {selected.links.length > 0 && (
                  <div className="py-2">
                    <dt className="mb-1 text-ink-muted">{t("links")}</dt>
                    <dd className="flex flex-col gap-1">
                      {selected.links.map((l) => (
                        <a key={l} href={l} target="_blank" rel="noopener noreferrer nofollow" className="link truncate">
                          {l}
                        </a>
                      ))}
                    </dd>
                  </div>
                )}
                {selected.message && (
                  <div className="py-2">
                    <dt className="mb-1 text-ink-muted">{t("message")}</dt>
                    <dd className="whitespace-pre-wrap text-ink">{selected.message}</dd>
                  </div>
                )}
                {selected.strategy && (
                  <div className="py-2">
                    <dt className="mb-1 text-ink-muted">{t("strategy")}</dt>
                    <dd className="whitespace-pre-wrap text-ink">{selected.strategy}</dd>
                  </div>
                )}
              </dl>

              <div className="space-y-3">
                <div>
                  <label htmlFor={`${uid}-notes`} className="label-text mb-1.5 block text-ink-muted">{t("notes")}</label>
                  <Textarea id={`${uid}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
                {selected.kind === "partner" && selected.status !== "APPROVED" && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label htmlFor={`${uid}-cc`} className="label-text mb-1.5 block text-ink-muted">{t("creatorCode")}</label>
                      <Input id={`${uid}-cc`} value={codes.creator} onChange={(e) => setCodes((c) => ({ ...c, creator: e.target.value }))} />
                    </div>
                    <div>
                      <label htmlFor={`${uid}-pc`} className="label-text mb-1.5 block text-ink-muted">{t("partnerCode")}</label>
                      <Input id={`${uid}-pc`} value={codes.partner} onChange={(e) => setCodes((c) => ({ ...c, partner: e.target.value }))} />
                    </div>
                    <div>
                      <label htmlFor={`${uid}-rule`} className="label-text mb-1.5 block text-ink-muted">{t("commissionRule")}</label>
                      <Select value={codes.rule || "__default__"} onValueChange={(v) => setCodes((c) => ({ ...c, rule: v === "__default__" ? "" : v }))}>
                        <SelectTrigger id={`${uid}-rule`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__default__">{t("noRule")}</SelectItem>
                          {rules.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name} ({r.type === "PERCENT" ? `${r.value} %` : r.value})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                {selected.status === "PENDING" && (
                  <Button variant="outline" disabled={pending} onClick={() => act("review")}>
                    {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {t("toReview")}
                  </Button>
                )}
                {selected.status !== "APPROVED" && selected.status !== "NEEDS_CHANGES" && (
                  <Button variant="outline" disabled={pending || !notes.trim()} onClick={() => act("needs_changes")}>
                    {t("requestChanges")}
                  </Button>
                )}
                {selected.status !== "REJECTED" && selected.status !== "APPROVED" && (
                  <Button variant="outline" disabled={pending} onClick={() => setConfirm("reject")}>
                    {t("reject")}
                  </Button>
                )}
                {selected.status !== "APPROVED" && (
                  <Button disabled={pending} onClick={() => setConfirm("approve")}>
                    {t("approve")}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm !== null && selected !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "approve" ? t("approveTitle", { name: selected?.name ?? "" }) : t("rejectTitle", { name: selected?.name ?? "" })}
        description={confirm === "approve" ? (selected?.kind === "partner" ? t("approvePartner") : t("approveCreator")) : t("rejectText")}
        confirmLabel={confirm === "approve" ? t("approve") : t("reject")}
        variant={confirm === "reject" ? "destructive" : "default"}
        loading={pending}
        onConfirm={() => act(confirm === "approve" ? "approve" : "reject")}
      />
    </>
  );
}
