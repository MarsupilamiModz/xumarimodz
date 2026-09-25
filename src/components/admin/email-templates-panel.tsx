"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { updateAdminEmailTemplate } from "@/actions/admin/email";
import type { EmailTemplate, EmailTemplateKey } from "@/lib/email/templates";
import { EDITOR_PLACEHOLDERS, SAMPLE_VALUES, renderTemplate } from "@/lib/email/render";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from "@/lib/utils";

type Draft = { name: string; subject: string; html: string };

/** Liste · Editor mit Platzhaltern · helle Vorschau mit Beispielwerten (sandboxed iframe). */
export function EmailTemplatesPanel({ templates }: { templates: EmailTemplate[] }) {
  const t = useTranslations("admin.et");
  const appToast = useAppToast();
  const router = useRouter();
  const uid = useId();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [pending, startTransition] = useTransition();
  const [activeKey, setActiveKey] = useState<EmailTemplateKey | undefined>(templates[0]?.key);
  const active = templates.find((tpl) => tpl.key === activeKey);
  const [draft, setDraft] = useState<Draft>(() => (active ? { name: active.name, subject: active.subject, html: active.html } : { name: "", subject: "", html: "" }));
  const [previewDraft, setPreviewDraft] = useState(draft);

  useEffect(() => {
    if (active) setDraft({ name: active.name, subject: active.subject, html: active.html });
  }, [active]);

  // Vorschau mit kurzer Verzögerung, damit das iframe nicht bei jedem Tastendruck neu lädt.
  useEffect(() => {
    const timer = setTimeout(() => setPreviewDraft(draft), 250);
    return () => clearTimeout(timer);
  }, [draft]);

  const rendered = useMemo(() => renderTemplate(previewDraft, SAMPLE_VALUES), [previewDraft]);
  const dirty = !!active && (draft.name !== active.name || draft.subject !== active.subject || draft.html !== active.html);

  function selectTemplate(key: EmailTemplateKey) {
    if (dirty && !window.confirm(t("unsaved"))) return;
    setActiveKey(key);
  }

  function insertPlaceholder(name: string) {
    const token = `%${name}%`;
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? draft.html.length;
    const end = el.selectionEnd ?? start;
    const next = draft.html.slice(0, start) + token + draft.html.slice(end);
    setDraft((d) => ({ ...d, html: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function save() {
    if (!active) return;
    startTransition(async () => {
      const r = await updateAdminEmailTemplate(active.key, draft);
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      appToast.saved(t("saved"));
      router.refresh();
    });
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
      <nav aria-label={t("list")} className="rounded-lg border border-line bg-raised p-2">
        <ul className="space-y-0.5">
          {templates.map((tpl) => (
            <li key={tpl.key}>
              <button
                type="button"
                onClick={() => selectTemplate(tpl.key)}
                aria-current={tpl.key === activeKey ? "true" : undefined}
                className={cn(
                  "relative flex h-[30px] w-full items-center truncate rounded-md px-3 text-left text-[13px] transition-colors duration-fast",
                  tpl.key === activeKey ? "bg-violet-soft font-semibold text-ink" : "text-ink-muted hover:bg-hover hover:text-ink"
                )}
              >
                {tpl.key === activeKey && <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-violet" aria-hidden />}
                {tpl.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {active && (
        <section className="space-y-4 rounded-lg border border-line bg-raised p-4" aria-labelledby={`${uid}-editor`}>
          <h2 id={`${uid}-editor`} className="section-title">{active.name}</h2>
          <div>
            <label htmlFor={`${uid}-name`} className="label-text mb-1.5 block text-ink-muted">{t("name")}</label>
            <Input id={`${uid}-name`} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </div>
          <div>
            <label htmlFor={`${uid}-subject`} className="label-text mb-1.5 block text-ink-muted">{t("subject")}</label>
            <Input id={`${uid}-subject`} value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} />
          </div>
          <div>
            <p className="label-text mb-1.5 text-ink-muted" id={`${uid}-ph`}>{t("placeholders")}</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={`${uid}-ph`}>
              {EDITOR_PLACEHOLDERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => insertPlaceholder(p)}
                  aria-label={t("insert", { placeholder: `%${p}%` })}
                  className="mono-id h-[26px] rounded-md border border-line px-2 text-ink-muted hover:border-line-control hover:text-ink"
                >
                  %{p}%
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor={`${uid}-body`} className="label-text mb-1.5 block text-ink-muted">{t("body")}</label>
            <Textarea
              id={`${uid}-body`}
              ref={bodyRef}
              value={draft.html}
              onChange={(e) => setDraft((d) => ({ ...d, html: e.target.value }))}
              rows={14}
              spellCheck={false}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2" hidden={!dirty}>
            <span className="text-sm font-medium text-ink" aria-live="polite">{dirty ? t("unsaved") : ""}</span>
            <span className="flex gap-2">
              <Button type="button" variant="ghost" disabled={pending} onClick={() => setDraft({ name: active.name, subject: active.subject, html: active.html })}>
                {t("discard")}
              </Button>
              <Button type="button" disabled={pending} onClick={save}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {t("save")}
              </Button>
            </span>
          </div>
        </section>
      )}

      {active && (
        <section className="rounded-lg border border-line bg-raised p-4" aria-labelledby={`${uid}-preview`}>
          <h2 id={`${uid}-preview`} className="section-title">{t("preview")}</h2>
          <p className="meta mb-3 mt-1 truncate">{t("previewSubject", { subject: rendered.subject })}</p>
          {/* sandbox ohne Rechte: kein Skript, keine Navigation aus der Vorschau heraus */}
          <iframe title={t("previewFrame")} sandbox="" srcDoc={rendered.html} className="h-[520px] w-full rounded-md border border-line bg-qr-background" />
        </section>
      )}
    </div>
  );
}
