"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { DMCAStatus } from "@prisma/client";
import { updateDMCAStatus } from "@/actions/admin/trust";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format-locale";

type Claim = {
  id: string;
  companyName: string;
  legalName: string;
  contactEmail: string;
  infringingUrl: string;
  description: string;
  status: DMCAStatus;
  createdAt: Date;
};

const STATUSES: DMCAStatus[] = ["SUBMITTED", "LEGAL_REVIEW", "ACCEPTED", "REMOVED", "REJECTED"];
const TONES: Record<DMCAStatus, StatusTone> = {
  SUBMITTED: "pending",
  LEGAL_REVIEW: "warning",
  ACCEPTED: "info",
  REMOVED: "success",
  REJECTED: "neutral",
};

function ClaimCard({ claim, locale, pending, onStatus }: { claim: Claim; locale: string; pending: boolean; onStatus: (status: DMCAStatus) => void }) {
  const t = useTranslations("admin.dmcaAdmin");
  const uid = useId();
  return (
    <SectionCard
      title={claim.companyName}
      description={`${claim.contactEmail} · ${formatDate(claim.createdAt, locale)}`}
      action={<StatusBadge tone={TONES[claim.status]} label={t(`status.${claim.status}`)} />}
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-[160px_minmax(0,1fr)]">
        <dt className="label-text">{t("legalName")}</dt>
        <dd className="text-ink">{claim.legalName}</dd>
        <dt className="label-text">{t("infringingUrl")}</dt>
        <dd className="break-all font-mono text-xs text-ink">{claim.infringingUrl}</dd>
        <dt className="label-text">{t("description")}</dt>
        <dd className="whitespace-pre-wrap text-ink-muted">{claim.description}</dd>
      </dl>
      <div className="mt-4">
        <label htmlFor={`${uid}-status`} className="label-text mb-1.5 block">{t("changeStatus")}</label>
        <Select value={claim.status} onValueChange={(v) => onStatus(v as DMCAStatus)} disabled={pending}>
          <SelectTrigger id={`${uid}-status`} className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </SectionCard>
  );
}

export function DMCAAdminPanel({ claims, locale }: { claims: Claim[]; locale: string }) {
  const t = useTranslations("admin.dmcaAdmin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setStatus(id: string, status: DMCAStatus) {
    startTransition(async () => {
      const r = await updateDMCAStatus(id, status);
      if (r.success) {
        toast({ title: "toast.dmcaUpdated" });
        router.refresh();
      } else toast({ title: "toast.error", description: r.error, variant: "destructive" });
    });
  }

  if (claims.length === 0) {
    return <EmptyState icon={ShieldCheck} title={t("emptyTitle")} description={t("emptyText")} />;
  }

  return (
    <div className="space-y-4">
      {claims.map((c) => (
        <ClaimCard key={c.id} claim={c} locale={locale} pending={pending} onStatus={(s) => setStatus(c.id, s)} />
      ))}
    </div>
  );
}
