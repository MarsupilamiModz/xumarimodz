import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { getAdminEmailSettings, listAdminEmailLogs } from "@/actions/admin/email";
import { listNewsletterCampaigns } from "@/actions/admin/newsletter";
import { NewsletterComposer } from "@/components/admin/newsletter-composer";
import { EmailSettingsPanel } from "@/components/admin/email-settings-panel";
import type { Locale } from "@/i18n/config";
import type { EmailSettingsPublic } from "@/lib/email/settings";

const EMPTY_FALLBACK = {
  enabled: false,
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  encryption: "STARTTLS" as const,
  passwordSet: false,
};

const EMPTY_SETTINGS: EmailSettingsPublic = {
  enabled: false,
  authMode: "smtp" as const,
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPasswordSet: false,
  microsoftTenantId: "",
  microsoftClientId: "",
  microsoftSecretSet: false,
  senderEmail: "",
  senderName: "XumariModz",
  replyToEmail: "",
  encryption: "STARTTLS" as const,
  supportEmail: "",
  ticketNotificationEmail: "",
  customOrderEmail: "",
  paymentNotificationEmail: "",
  adminNotificationEmail: "",
  contactFormEmail: "",
  configured: false,
  fallbackSes: EMPTY_FALLBACK,
  fallbackBrevo: EMPTY_FALLBACK,
};

export default async function AdminEmailPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");

  const [t, settingsResult, logsResult, campaignsResult] = await Promise.all([getTranslations("admin.em"), getAdminEmailSettings(), listAdminEmailLogs(), listNewsletterCampaigns()]);

  const settings = settingsResult.success ? settingsResult.data : EMPTY_SETTINGS;
  const logs = logsResult.success ? logsResult.data : [];
  const errors = [
    !settingsResult.success ? settingsResult.error : null,
    !logsResult.success ? logsResult.error : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href={`/${locale}/admin/email/templates`}>{t("templates")}</Link>
          </Button>
        }
      />
      <NewsletterComposer
        locale={locale}
        campaigns={
          campaignsResult.success
            ? campaignsResult.data.map((c) => ({
                id: c.id,
                subject: c.subject,
                audience: c.audience,
                recipientCount: c.recipientCount,
                createdAt: c.createdAt.toISOString(),
                author: c.createdBy?.username ?? null,
                sent: c.sent,
                failed: c.failed,
                pending: c.pending,
              }))
            : []
        }
      />

      {errors.length > 0 && (
        <div role="alert" className="space-y-1 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm">
          {errors.map((msg) => (
            <p key={msg} className="text-danger">{msg}</p>
          ))}
          {!logsResult.success && <p className="text-xs text-ink-muted">{t("logsUnavailable")}</p>}
        </div>
      )}

      <EmailSettingsPanel settings={settings} logs={logs} locale={locale} />
    </div>
  );
}
