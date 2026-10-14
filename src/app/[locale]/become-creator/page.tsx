import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getMyCreatorApplication } from "@/actions/applications";
import { CreatorApplicationForm } from "@/components/applications/creator-application-form";
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

export default async function BecomeCreatorPage(
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
  const existing = await getMyCreatorApplication(user.id);
  const [t, te, ts] = await Promise.all([
    getTranslations("publicPages.becomeCreator"),
    getTranslations("ecosystem"),
    getTranslations("status.application"),
  ]);

  if (existing && existing.status !== "REJECTED") {
    return (
      <div className="page-section">
        <div className="max-w-2xl">
          <PageHeader title={t("applicationTitle")} />
          <SectionCard>
            <StatusBadge tone={STATUS_TONE[existing.status] ?? "neutral"} label={ts(existing.status)} />
            <p className="mt-3 text-sm text-ink-muted">
              {t("submittedOn", { date: formatDate(existing.createdAt, locale) })}
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
        <PageHeader title={te("becomeCreator")} description={t("intro")} />
        <CreatorApplicationForm userEmail={user.email} />
      </div>
    </div>
  );
}
