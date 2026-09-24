"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { KeyRound, Loader2 } from "lucide-react";
import { createApiKeyAdmin, revokeApiKeyAdmin } from "@/actions/admin/api-keys";
import { API_KEY_PRESETS } from "@/lib/api-scopes";
import { formatDateTime, formatNumber } from "@/lib/format-locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from "@/lib/utils";

type ApiKeyRow = {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  requestCount: number;
  errorCount: number;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  createdBy: { username: string };
};

type Totals = {
  _sum: { requestCount: number | null; errorCount: number | null; uploadCount: number | null; uploadBytes: bigint | number | null };
};

type ApiLog = { id: string; action: string; entityId: string | null; createdAt: Date };

type Preset = keyof typeof API_KEY_PRESETS;
const PRESET_LABEL: Record<string, string> = { upload: "presetUpload", download: "presetDownload", readonly: "presetReadonly", full: "presetFull" };
const RATE_OPTIONS = [100, 1000, 10000];

export function ApiKeysPanel({
  locale,
  keys,
  totals,
  recentLogs,
}: {
  locale: string;
  keys: ApiKeyRow[];
  totals: Totals;
  recentLogs: ApiLog[];
}) {
  const t = useTranslations("admin.ak");
  const router = useRouter();
  const appToast = useAppToast();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revoke, setRevoke] = useState<ApiKeyRow | null>(null);
  const [form, setForm] = useState({ name: "", description: "", preset: "readonly" as Preset, rateLimit: API_KEY_PRESETS.readonly.rateLimit, expiresAt: "", ipWhitelist: "" });

  function createKey(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await createApiKeyAdmin({
        name: form.name,
        description: form.description || undefined,
        preset: form.preset,
        scopes: [],
        rateLimit: form.rateLimit,
        expiresAt: form.expiresAt || undefined,
        ipWhitelist: form.ipWhitelist.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
      });
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      setRevealed(r.data.key);
      setForm({ name: "", description: "", preset: "readonly", rateLimit: API_KEY_PRESETS.readonly.rateLimit, expiresAt: "", ipWhitelist: "" });
      appToast.created(t("created"));
      router.refresh();
    });
  }

  function confirmRevoke() {
    if (!revoke) return;
    startTransition(async () => {
      const r = await revokeApiKeyAdmin(revoke.id);
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      setRevoke(null);
      appToast.updated(t("revokedToast"));
      router.refresh();
    });
  }

  const now = Date.now();
  const uploadMb = Number(totals._sum.uploadBytes ?? 0) / (1024 * 1024);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("requests")} value={formatNumber(totals._sum.requestCount ?? 0, locale)} />
        <KpiTile label={t("errors")} value={formatNumber(totals._sum.errorCount ?? 0, locale)} />
        <KpiTile label={t("uploads")} value={formatNumber(totals._sum.uploadCount ?? 0, locale)} />
        <KpiTile label={t("bandwidth")} value={`${uploadMb.toFixed(1)} MB`} />
      </div>

      {revealed && (
        <section role="alert" className="rounded-lg border border-violet/40 bg-violet-soft p-4">
          <h2 className="section-title">{t("revealTitle")}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("revealText")}</p>
          <code className="mono-id mt-3 block break-all rounded-md border border-line bg-canvas p-3 text-ink">{revealed}</code>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton value={revealed} label={t("copy")} copiedLabel={t("copied")} />
            <Button size="sm" onClick={() => setRevealed(null)}>{t("done")}</Button>
          </div>
        </section>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-lg border border-line bg-raised">
          <h2 className="section-title flex h-12 items-center border-b border-line px-4">{t("keys")}</h2>
          {keys.length === 0 ? (
            <EmptyState className="m-4" icon={KeyRound} title={t("emptyTitle")} description={t("emptyText")} />
          ) : (
            <ul className="divide-y divide-line">
              {keys.map((key) => {
                const expired = !!key.expiresAt && new Date(key.expiresAt).getTime() < now;
                return (
                  <li key={key.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[13px] font-semibold text-ink">{key.name}</p>
                      {key.description && <p className="text-xs text-ink-muted">{key.description}</p>}
                      <p className="mono-id text-ink-faint">{key.keyPrefix}••••••••</p>
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((s) => (
                          <Badge key={s} variant="outline">{s}</Badge>
                        ))}
                      </div>
                      <p className="meta text-ink-faint">
                        {t("usage", { requests: formatNumber(key.requestCount, locale), errors: formatNumber(key.errorCount, locale) })} ·{" "}
                        {t("perMinute", { count: formatNumber(key.rateLimit, locale) })} · {t("colLastUsed")}:{" "}
                        {key.lastUsedAt ? formatDateTime(key.lastUsedAt, locale) : t("never")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!key.isActive ? (
                        <StatusBadge tone="neutral" label={t("revoked")} />
                      ) : expired ? (
                        <StatusBadge tone="warning" label={t("expired")} />
                      ) : (
                        <StatusBadge tone="success" label={t("active")} />
                      )}
                      {key.isActive && (
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => setRevoke(key)}>
                          {t("revoke")}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-raised p-4">
            <h2 className="section-title mb-4">{t("create")}</h2>
            <form onSubmit={createKey} className="space-y-4">
              <ChipTabs
                label={t("preset")}
                value={form.preset}
                options={Object.keys(API_KEY_PRESETS).map((id) => ({ value: id, label: t(PRESET_LABEL[id] ?? "presetReadonly") }))}
                onChange={(v) => setForm((f) => ({ ...f, preset: v as Preset, rateLimit: API_KEY_PRESETS[v as Preset].rateLimit }))}
              />
              <div>
                <label htmlFor={`${uid}-name`} className="label-text mb-1.5 block text-ink-muted">{t("name")}</label>
                <Input id={`${uid}-name`} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required maxLength={80} />
              </div>
              <div>
                <label htmlFor={`${uid}-desc`} className="label-text mb-1.5 block text-ink-muted">{t("description")}</label>
                <Input id={`${uid}-desc`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={200} />
              </div>
              <fieldset>
                <legend className="label-text mb-1.5 text-ink-muted">{t("rateLimit")}</legend>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set([...RATE_OPTIONS, API_KEY_PRESETS[form.preset].rateLimit])).sort((a, b) => a - b).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={form.rateLimit === v}
                      onClick={() => setForm((f) => ({ ...f, rateLimit: v }))}
                      className={cn(
                        "h-[30px] rounded-md border px-3 text-xs font-semibold tabular-nums transition-colors duration-fast",
                        form.rateLimit === v ? "border-violet bg-violet-soft text-violet-bright" : "border-line text-ink-muted hover:text-ink"
                      )}
                    >
                      {formatNumber(v, locale)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor={`${uid}-exp`} className="label-text mb-1.5 block text-ink-muted">{t("expires")}</label>
                <Input id={`${uid}-exp`} type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
              </div>
              <div>
                <label htmlFor={`${uid}-ip`} className="label-text mb-1.5 block text-ink-muted">{t("ipWhitelist")}</label>
                <Input id={`${uid}-ip`} value={form.ipWhitelist} onChange={(e) => setForm((f) => ({ ...f, ipWhitelist: e.target.value }))} />
              </div>
              <p className="meta text-ink-faint">{t("auth")}</p>
              <Button type="submit" disabled={pending || !form.name.trim()}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {t("generate")}
              </Button>
            </form>
          </section>

          <section className="rounded-lg border border-line bg-raised">
            <h2 className="section-title flex h-12 items-center border-b border-line px-4">{t("log")}</h2>
            {recentLogs.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-muted">{t("logEmpty")}</p>
            ) : (
              <ul className="max-h-72 divide-y divide-line overflow-y-auto">
                {recentLogs.map((log) => (
                  <li key={log.id} className="flex justify-between gap-3 px-4 py-2 text-xs">
                    <span className="mono-id text-ink">{log.action}</span>
                    <span className="shrink-0 tabular-nums text-ink-faint">{formatDateTime(log.createdAt, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={revoke !== null}
        onOpenChange={(o) => !o && setRevoke(null)}
        title={t("revokeTitle", { name: revoke?.name ?? "" })}
        description={t("revokeText")}
        confirmLabel={t("revoke")}
        variant="destructive"
        loading={pending}
        onConfirm={confirmRevoke}
      />
    </div>
  );
}
