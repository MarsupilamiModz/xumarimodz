"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { saveAdminMediaSettings } from "@/actions/mod-media";
import type { MediaSettings } from "@/lib/media-settings-shared";
import { DEFAULT_MEDIA_SETTINGS } from "@/lib/media-settings-shared";
import { useAppToast } from "@/hooks/use-app-toast";

type MediaSettingsPanelProps = {
  initial: MediaSettings;
};

/** Feld mit sichtbarem Label. */
function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="label-text">{label}</label>
      {children}
    </div>
  );
}

export function MediaSettingsPanel({ initial }: MediaSettingsPanelProps) {
  const t = useTranslations("admin.panelMediaSettings");
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();

  return (
    <SectionCard title={t("title")} className="max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const settings: MediaSettings = {
            minScreenshots: Number(fd.get("minScreenshots")),
            maxScreenshots: Number(fd.get("maxScreenshots")),
            allowedTypes: (fd.get("allowedTypes") as string)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .map((ext) => `image/${ext}`),
            maxFileSizeMb: Number(fd.get("maxFileSizeMb")),
            imageQuality: Number(fd.get("imageQuality")) / 100,
          };
          startTransition(async () => {
            const r = await saveAdminMediaSettings(settings);
            if (r.success) appToast.saved();
            else appToast.error(r.error);
          });
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="media-min-screenshots" label={t("minScreenshots")}>
            <Input id="media-min-screenshots" name="minScreenshots" type="number" min={0} defaultValue={initial.minScreenshots} className="tabular-nums" />
          </Field>
          <Field id="media-max-screenshots" label={t("maxScreenshots")}>
            <Input id="media-max-screenshots" name="maxScreenshots" type="number" min={1} max={50} defaultValue={initial.maxScreenshots} className="tabular-nums" />
          </Field>
        </div>
        <Field id="media-allowed-types" label={t("allowedTypes")}>
          <Input
            id="media-allowed-types"
            name="allowedTypes"
            defaultValue={initial.allowedTypes.map((type) => type.split("/")[1]).join(", ")}
            placeholder={t("allowedTypesPlaceholder")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="media-max-size" label={t("maxFileSizeMb")}>
            <Input id="media-max-size" name="maxFileSizeMb" type="number" min={1} max={20} defaultValue={initial.maxFileSizeMb} className="tabular-nums" />
          </Field>
          <Field id="media-quality" label={t("imageQuality")}>
            <Input
              id="media-quality"
              name="imageQuality"
              type="number"
              min={50}
              max={100}
              defaultValue={Math.round((initial.imageQuality ?? DEFAULT_MEDIA_SETTINGS.imageQuality) * 100)}
              className="tabular-nums"
            />
          </Field>
        </div>
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
      </form>
    </SectionCard>
  );
}
