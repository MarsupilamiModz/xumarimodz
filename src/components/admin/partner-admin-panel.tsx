"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PublisherLevel } from "@prisma/client";
import {
  updatePartnerProfile,
  setPartnerLevel,
  assignPartnerCode,
  deletePartnerProfile,
} from "@/actions/admin/partners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEVEL_OPTIONS } from "@/lib/creator-levels";
import { formatCents } from "@/lib/affiliate";
import { formatNumber } from "@/lib/format-locale";
import { useAppToast } from "@/hooks/use-app-toast";

type PartnerData = {
  id: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  website: string | null;
  affiliateCode: string | null;
  level: PublisherLevel;
  commissionRateBps: number;
  isVerified: boolean;
  isFeatured: boolean;
  isSuspended: boolean;
  isBanned: boolean;
  totalClicks: number;
  totalConversions: number;
  totalRevenueCents: number;
  discordInviteUrl?: string | null;
  discordWidgetUrl?: string | null;
  discordServerId?: string | null;
  discordWidgetEnabled?: boolean;
  discordDescription?: string | null;
  user: { id: string; username: string; displayName: string | null; email: string };
};

/** Textfeld mit sichtbarem Label (Platzhalter allein reicht nicht). */
function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="label-text">{label}</label>
      {children}
    </div>
  );
}

export function PartnerAdminPanel({ locale, partner }: { locale: string; partner: PartnerData }) {
  const t = useTranslations("admin.ui.partnerAdmin");
  const tb = useTranslations("admin.partnerDetail");
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState(partner.affiliateCode ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Jedes Formular schickt nur seine eigenen Felder – sonst setzte das Profil-Formular die Discord-Felder
  // auf leer und das Discord-Formular verifiziert/hervorgehoben/gesperrt auf aus (fehlende Checkbox = aus).
  const save = (formData: FormData, group: "profile" | "discord") => {
    const fields =
      group === "profile"
        ? {
            tagline: (formData.get("tagline") as string) || undefined,
            description: (formData.get("description") as string) || undefined,
            website: (formData.get("website") as string) || undefined,
            commissionRateBps: Number(formData.get("commissionRateBps")),
            isVerified: formData.get("isVerified") === "on",
            isFeatured: formData.get("isFeatured") === "on",
            isSuspended: formData.get("isSuspended") === "on",
          }
        : {
            discordInviteUrl: (formData.get("discordInviteUrl") as string) || null,
            discordWidgetUrl: (formData.get("discordWidgetUrl") as string) || null,
            discordServerId: (formData.get("discordServerId") as string) || null,
            discordWidgetEnabled: formData.get("discordWidgetEnabled") === "on",
            discordDescription: (formData.get("discordDescription") as string) || null,
          };
    startTransition(async () => {
      const r = await updatePartnerProfile(partner.id, { userId: partner.user.id, ...fields });
      if (r.success) { appToast.saved(); router.refresh(); }
      else appToast.error(r.error);
    });
  };

  const checkbox = (name: string, label: string, checked: boolean) => (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="checkbox" name={name} defaultChecked={checked} />
      {label}
    </label>
  );

  return (
    <div className="space-y-6">
      {(partner.isVerified || partner.isFeatured || partner.isSuspended) && (
        <div className="flex flex-wrap gap-2">
          {partner.isVerified && <StatusBadge tone="success" label={t("verifiedBadge")} />}
          {partner.isFeatured && <StatusBadge tone="info" label={t("featuredBadge")} />}
          {partner.isSuspended && <StatusBadge tone="danger" label={t("suspendedBadge")} />}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiTile label={t("clicksLabel")} value={formatNumber(partner.totalClicks, locale)} />
        <KpiTile label={t("conversionsLabel")} value={formatNumber(partner.totalConversions, locale)} />
        <KpiTile label={t("revenueLabel")} value={formatCents(partner.totalRevenueCents, locale)} />
      </div>

      <SectionCard title={tb("profile")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(new FormData(e.currentTarget), "profile");
          }}
          className="space-y-4"
        >
          <Field id="partner-tagline" label={t("taglinePlaceholder")}>
            <Input id="partner-tagline" name="tagline" defaultValue={partner.tagline ?? ""} />
          </Field>
          <Field id="partner-description" label={t("bioPlaceholder")}>
            <Textarea id="partner-description" name="description" defaultValue={partner.description ?? ""} rows={4} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="partner-website" label={t("websitePlaceholder")}>
              <Input id="partner-website" name="website" defaultValue={partner.website ?? ""} />
            </Field>
            <Field id="partner-commission" label={t("commissionPlaceholder")}>
              <Input id="partner-commission" name="commissionRateBps" type="number" defaultValue={partner.commissionRateBps} className="tabular-nums" />
            </Field>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {checkbox("isVerified", t("verifiedLabel"), partner.isVerified)}
            {checkbox("isFeatured", t("featuredLabel"), partner.isFeatured)}
            {checkbox("isSuspended", t("suspendedLabel"), partner.isSuspended)}
          </div>
          <Button type="submit" disabled={pending}>{t("savePartner")}</Button>
        </form>
      </SectionCard>

      <SectionCard title={t("discordCommunityTitle")} description={t("discordHint")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(new FormData(e.currentTarget), "discord");
          }}
          className="space-y-4"
        >
          <Field id="partner-discord-invite" label={t("discordInvitePlaceholder")}>
            <Input id="partner-discord-invite" name="discordInviteUrl" defaultValue={partner.discordInviteUrl ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="partner-discord-server" label={t("discordServerIdPlaceholder")}>
              <Input id="partner-discord-server" name="discordServerId" defaultValue={partner.discordServerId ?? ""} className="mono-id" />
            </Field>
            <Field id="partner-discord-widget" label={t("discordWidgetUrlPlaceholder")}>
              <Input id="partner-discord-widget" name="discordWidgetUrl" defaultValue={partner.discordWidgetUrl ?? ""} className="mono-id" />
            </Field>
          </div>
          <Field id="partner-discord-description" label={t("discordDescriptionPlaceholder")}>
            <Textarea id="partner-discord-description" name="discordDescription" defaultValue={partner.discordDescription ?? ""} rows={3} />
          </Field>
          {checkbox("discordWidgetEnabled", t("showDiscordWidget"), partner.discordWidgetEnabled !== false)}
          <Button type="submit" variant="outline" disabled={pending}>{t("saveDiscordSettings")}</Button>
        </form>
      </SectionCard>

      <SectionCard title={t("levelCodesTitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="partner-level" label={tb("levelLabel")}>
            <Select
              defaultValue={partner.level}
              onValueChange={(v) => startTransition(async () => {
                const r = await setPartnerLevel(partner.id, v as PublisherLevel);
                if (r.success) { appToast.saved(); router.refresh(); }
              })}
            >
              <SelectTrigger id="partner-level"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((l) => (
                  <SelectItem key={l} value={l}>{tb(`level.${l}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="partner-code" label={t("affiliateCodePlaceholder")}>
            <div className="flex gap-2">
              <Input id="partner-code" value={code} onChange={(e) => setCode(e.target.value)} className="mono-id" />
              <Button variant="outline" disabled={pending} onClick={() => startTransition(async () => {
                const r = await assignPartnerCode(partner.id, code);
                if (r.success) { appToast.saved(); router.refresh(); }
                else appToast.error(r.error);
              })}>{t("assignCode")}</Button>
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={tb("dangerZone")} description={tb("dangerText")}>
        <Button variant="destructive" disabled={pending} onClick={() => setConfirmDelete(true)}>
          {t("deletePartner")}
        </Button>
      </SectionCard>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deletePartnerConfirm")}
        description={tb("deleteText")}
        confirmLabel={t("deletePartner")}
        variant="destructive"
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await deletePartnerProfile(partner.id);
            if (r.success) router.push(`/${locale}/admin/partners`);
            else appToast.error(r.error);
          })
        }
      />
    </div>
  );
}
