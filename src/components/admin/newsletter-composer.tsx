"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Send } from "lucide-react";
import { countNewsletterRecipientsAdmin, createNewsletterCampaign, processNewsletterQueueAdmin, sendNewsletterTest } from "@/actions/admin/newsletter";
import { SAMPLE_VALUES, renderTemplate } from "@/lib/email/render";
import { Button } from "@/components/ui/button";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDateTime } from "@/lib/format-locale";

const AUDIENCES = ["all", "premium", "free", "creators", "partners"] as const;
type Audience = (typeof AUDIENCES)[number];

type Campaign = { id: string; subject: string; audience: string; recipientCount: number; createdAt: string; author: string | null; sent: number; failed: number; pending: number };

/**
 * Rundmail: Empfängergruppe mit Live-Zählung (nur Einwilligung), Betreff, Text, helle Vorschau,
 * „Test an mich senden“ und Versand über die Queue; darunter der Verlauf.
 */
export function NewsletterComposer({ locale, campaigns }: { locale: string; campaigns: Campaign[] }) {
  const t = useTranslations("admin.nl");
  const router = useRouter();
  const appToast = useAppToast();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [audience, setAudience] = useState<Audience>("all");
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("<p>Hallo %username%,</p>\n<p></p>");
  const [confirm, setConfirm] = useState(false);

  // Empfängerzahl live, sobald die Gruppe wechselt (mit kurzer Verzögerung).
  useEffect(() => {
    let active = true;
    setCounting(true);
    const timer = setTimeout(async () => {
      const r = await countNewsletterRecipientsAdmin(audience);
      if (!active) return;
      setCounting(false);
      setCount(r.success ? r.data : null);
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [audience]);

  const preview = useMemo(() => renderTemplate({ subject, html }, SAMPLE_VALUES), [subject, html]);
  const valid = subject.trim().length >= 3 && html.trim().length >= 10;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-raised p-4" aria-labelledby={`${uid}-h`}>
        <h2 id={`${uid}-h`} className="section-title">{t("title")}</h2>
        <p className="mb-4 mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <ChipTabs label={t("audience")} value={audience} options={AUDIENCES.map((a) => ({ value: a, label: t(`aud.${a}`) }))} onChange={(v) => setAudience(v as Audience)} />
            <p className="text-sm text-ink" aria-live="polite">
              {counting || count === null ? <Loader2 className="inline h-4 w-4 animate-spin text-ink-faint" aria-label={t("counting")} /> : t("recipients", { count })}
            </p>
            <div>
              <label htmlFor={`${uid}-subject`} className="label-text mb-1.5 block text-ink-muted">{t("subject")}</label>
              <Input id={`${uid}-subject`} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
            </div>
            <div>
              <label htmlFor={`${uid}-html`} className="label-text mb-1.5 block text-ink-muted">{t("body")}</label>
              <Textarea id={`${uid}-html`} value={html} onChange={(e) => setHtml(e.target.value)} rows={12} spellCheck={false} className="font-mono text-xs" />
              <p className="meta mt-1">{t("bodyHint")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={pending || !valid}
                onClick={() =>
                  startTransition(async () => {
                    const r = await sendNewsletterTest({ subject, html });
                    if (r.success) appToast.updated(t("testSent"));
                    else appToast.error(r.error);
                  })
                }
              >
                {t("sendTest")}
              </Button>
              <Button disabled={pending || !valid || !count} onClick={() => setConfirm(true)}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                {t("send")}
              </Button>
            </div>
          </div>
          <div>
            <p className="label-text mb-1.5 text-ink-muted">{t("preview")}</p>
            <p className="meta mb-2 truncate">{preview.subject || "—"}</p>
            <iframe title={t("preview")} sandbox="" srcDoc={preview.html} className="h-[420px] w-full rounded-md border border-line bg-qr-background" />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-raised" aria-labelledby={`${uid}-history`}>
        <div className="flex h-12 items-center justify-between border-b border-line px-4">
          <h2 id={`${uid}-history`} className="section-title">{t("history")}</h2>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await processNewsletterQueueAdmin();
                if (r.success) {
                  appToast.updated(t("processed", { sent: r.data.sent, processed: r.data.processed }));
                  router.refresh();
                } else appToast.error(r.error);
              })
            }
          >
            {t("processQueue")}
          </Button>
        </div>
        {campaigns.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <caption className="sr-only">{t("history")}</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th scope="col" className="px-4 py-2 font-medium">{t("colSubject")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("audience")}</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">{t("colStatus")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("colDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-row-hover">
                    <td className="px-4 py-2">
                      <span className="text-ink">{c.subject}</span>
                      {c.author && <span className="meta block">@{c.author}</span>}
                    </td>
                    <td className="px-4 py-2 text-ink-muted">{(AUDIENCES as readonly string[]).includes(c.audience) ? t(`aud.${c.audience}`) : c.audience}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-muted">{t("stats", { sent: c.sent, total: c.recipientCount, pending: c.pending, failed: c.failed })}</td>
                    <td className="px-4 py-2 tabular-nums text-ink-muted">{formatDateTime(c.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("confirmTitle", { count: count ?? 0 })}
        description={t("confirmText")}
        confirmLabel={t("send")}
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await createNewsletterCampaign({ audience, subject, html });
            if (!r.success) {
              appToast.error(r.error);
              return;
            }
            setConfirm(false);
            setSubject("");
            appToast.created(t("queued", { count: r.data.recipients }));
            router.refresh();
          })
        }
      />
    </div>
  );
}
