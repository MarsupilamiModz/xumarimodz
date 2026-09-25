"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, Loader2 } from "lucide-react";
import { bulkGenerateLicenses, updateLicenseStatus } from "@/actions/admin/licenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppToast } from "@/hooks/use-app-toast";

type Product = "premium" | "mod" | "bundle";

function downloadCsv(keys: string[], meta: { product: string; devices: number; label?: string }) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = ["key,product,devices,label", ...keys.map((k) => [k, meta.product, String(meta.devices), meta.label ?? ""].map(esc).join(","))];
  const blob = new Blob([`﻿${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `license-keys-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Formular „Schlüssel erzeugen“ (Produkt, Anzahl, Geräte); die neuen Schlüssel gibt es einmalig als CSV. */
export function LicenseGenerator({ mods }: { mods: { id: string; title: string }[] }) {
  const t = useTranslations("admin.li");
  const router = useRouter();
  const appToast = useAppToast();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [product, setProduct] = useState<Product>("premium");
  const [modId, setModId] = useState("");
  const [count, setCount] = useState(10);
  const [devices, setDevices] = useState(1);
  const [label, setLabel] = useState("");
  const [result, setResult] = useState<{ keys: string[]; product: string; devices: number; label?: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await bulkGenerateLicenses({
        count,
        productType: product,
        modId: product === "mod" ? modId : undefined,
        maxActivations: devices,
        label: label.trim() || undefined,
      });
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      setResult({ keys: r.data.keys, product, devices, label: label.trim() || undefined });
      appToast.created(t("generated", { count: r.data.keys.length }));
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-line bg-raised p-4">
      <h2 className="section-title mb-4">{t("generate")}</h2>
      {result ? (
        <div role="alert" className="space-y-3">
          <p className="text-[13px] font-semibold text-ink">{t("generated", { count: result.keys.length })}</p>
          <p className="text-sm text-ink-muted">{t("revealText")}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => downloadCsv(result.keys, result)}>
              <Download className="h-4 w-4" aria-hidden />
              {t("csv")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setResult(null)}>
              {t("close")}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <ChipTabs
            label={t("product")}
            value={product}
            options={(["premium", "mod", "bundle"] as const).map((p) => ({ value: p, label: t(`product.${p}`) }))}
            onChange={(v) => setProduct(v as Product)}
          />
          {product === "mod" && (
            <div>
              <label htmlFor={`${uid}-mod`} className="label-text mb-1.5 block text-ink-muted">{t("mod")}</label>
              <Select value={modId} onValueChange={setModId}>
                <SelectTrigger id={`${uid}-mod`}><SelectValue placeholder={t("modPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {mods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${uid}-count`} className="label-text mb-1.5 block text-ink-muted">{t("amount")}</label>
              <Input id={`${uid}-count`} type="number" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value))} className="tabular-nums" required />
            </div>
            <div>
              <label htmlFor={`${uid}-dev`} className="label-text mb-1.5 block text-ink-muted">{t("devices")}</label>
              <Input id={`${uid}-dev`} type="number" min={1} max={100} value={devices} onChange={(e) => setDevices(Number(e.target.value))} className="tabular-nums" required />
            </div>
          </div>
          <div>
            <label htmlFor={`${uid}-label`} className="label-text mb-1.5 block text-ink-muted">{t("label")}</label>
            <Input id={`${uid}-label`} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} />
          </div>
          <Button type="submit" disabled={pending || (product === "mod" && !modId) || count < 1}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t("generate")}
          </Button>
        </form>
      )}
    </section>
  );
}

export function LicenseRevokeButton({ id, maskedKey }: { id: string; maskedKey: string }) {
  const t = useTranslations("admin.li");
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="ghost" className="relative z-10" disabled={pending} onClick={() => setOpen(true)}>
        {t("revoke")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("revokeTitle", { key: maskedKey })}
        description={t("revokeText")}
        confirmLabel={t("revoke")}
        variant="destructive"
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await updateLicenseStatus(id, "REVOKED");
            if (!r.success) {
              appToast.error(r.error);
              return;
            }
            setOpen(false);
            appToast.updated(t("revoked"));
            router.refresh();
          })
        }
      />
    </>
  );
}
