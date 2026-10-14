import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getMyPartnerApplication } from "@/actions/applications";
import { getPartnerFormFields } from "@/lib/partner-form-config";
import { PartnerApplicationForm } from "@/components/applications/partner-application-form";
import { PageHeader, SectionCard } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";

const STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "pending",
  UNDER_REVIEW: "info",
  NEEDS_CHANGES: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export default async function BecomePartnerPage(
  props: {
    params: Promise<{ locale: Locale }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const user = await requireAuth(`/${locale}/login`);
  const existing = await getMyPartnerApplication(user.id);
  const [t, te, tp, ts] = await Promise.all([
    getTranslations("publicPages.becomePartner"),
    getTranslations("ecosystem"),
    getTranslations("common.cx.partnerApplication"),
    getTranslations("status.application"),
  ]);

  if (existing && existing.status !== "REJECTED") {
    return (
      <div className="page-section">
        <div className="max-w-2xl">
          <PageHeader title={tp("title")} />
          <SectionCard>
            <StatusBadge tone={STATUS_TONE[existing.status] ?? "neutral"} label={ts(existing.status)} />
            <p className="mt-3 text-sm text-ink-muted">
              {tp("submitted", { date: formatDate(existing.createdAt, locale) })}
            </p>
            {existing.adminNotes && (
              <p className="mt-2 text-sm text-ink-muted">{t("note", { note: existing.adminNotes })}</p>
            )}
          </SectionCard>
        </div>
      </div>
    );
  }

  return (
    <div className="page-section">
      <div className="max-w-2xl">
        <PageHeader title={te("becomePartner")} description={t("intro")} />
        <PartnerApplicationForm fields={await getPartnerFormFields()} userEmail={user.email} username={user.username} />
      </div>
    </div>
  );
}
