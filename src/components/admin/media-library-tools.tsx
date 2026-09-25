"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteMediaFileAdmin, saveMediaAltText } from "@/actions/admin/media-center";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAppToast } from "@/hooks/use-app-toast";

/** Liest die Bildmaße aus der geladenen Vorschau (keine gespeicherten Werte nötig). */
export function MediaPreview({ src, alt, isImage, dimensionsLabel }: { src: string; alt: string; isImage: boolean; dimensionsLabel: string }) {
  const [dims, setDims] = useState<string | null>(null);
  if (!isImage) return null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- beliebige Upload-Hosts, Maße aus dem Original */}
      <img
        src={src}
        alt={alt}
        onLoad={(e) => setDims(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight} px`)}
        className="max-h-56 w-full rounded-md border border-line bg-elevated object-contain"
      />
      <p className="meta mt-2 tabular-nums">
        {dimensionsLabel}: {dims ?? "…"}
      </p>
    </>
  );
}

export function MediaDeleteButton({ id, name, usedIn, redirectTo }: { id: string; name: string; usedIn: string | null; redirectTo: string }) {
  const t = useTranslations("admin.md");
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setOpen(true)}>
        {t("delete")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("deleteTitle", { name })}
        description={usedIn ? `${t("deleteUsed", { place: usedIn })} ${t("deleteText")}` : t("deleteText")}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await deleteMediaFileAdmin(id, !!usedIn);
            if (!r.success) {
              appToast.error(r.error);
              return;
            }
            setOpen(false);
            appToast.deleted(t("deleted"));
            router.push(redirectTo);
            router.refresh();
          })
        }
      />
    </>
  );
}

/** Alt-Text der Datei (Beschreibung für Screenreader und Suchmaschinen). */
export function MediaAltTextForm({ id, initial }: { id: string; initial: string }) {
  const t = useTranslations("admin.md");
  const router = useRouter();
  const appToast = useAppToast();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await saveMediaAltText(id, value);
          if (!r.success) {
            appToast.error(r.error);
            return;
          }
          appToast.saved(t("altSaved"));
          router.refresh();
        });
      }}
    >
      <label htmlFor={`alt-${id}`} className="label-text block text-ink-muted">{t("altText")}</label>
      <div className="flex gap-2">
        <Input id={`alt-${id}`} value={value} onChange={(e) => setValue(e.target.value)} maxLength={300} />
        <Button type="submit" size="sm" variant="outline" disabled={pending || value === initial}>{t("save")}</Button>
      </div>
      <p className="meta">{t("altHint")}</p>
    </form>
  );
}
