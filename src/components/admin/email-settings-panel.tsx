"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import {
  updateAdminEmailSettings,
  testAdminEmailConnection,
  sendAdminTestEmail,
  retryAdminEmailLog,
} from "@/actions/admin/email";
import type { EmailSettingsPublic } from "@/lib/email/settings";
import { Button } from "@/components/ui/button";
import { Input, controlClassName } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDateTime } from "@/lib/format-locale";
import { cn } from "@/lib/utils";

type EmailLog = {
  id: string;
  to: string;
  subject: string;
  templateKey: string | null;
  status: string;
  error: string | null;
  attempts: number;
  sentAt: Date | null;
  createdAt: Date;
};

const LOG_TONE: Record<string, StatusTone> = { SENT: "success", FAILED: "danger", PENDING: "pending" };

function readEmailForm(form: HTMLFormElement) {
  const fd = new FormData(form);
  return {
    enabled: fd.get("enabled") === "on",
    authMode: (fd.get("authMode") as "smtp" | "microsoft" | "graph") || "smtp",
    smtpHost: fd.get("smtpHost") as string,
    smtpPort: Number(fd.get("smtpPort") || 587),
    smtpUser: fd.get("smtpUser") as string,
    smtpPassword: (fd.get("smtpPassword") as string) || undefined,
    microsoftTenantId: fd.get("microsoftTenantId") as string,
    microsoftClientId: fd.get("microsoftClientId") as string,
    microsoftClientSecret: (fd.get("microsoftClientSecret") as string) || undefined,
    senderEmail: fd.get("senderEmail") as string,
    senderName: fd.get("senderName") as string,
    replyToEmail: fd.get("replyToEmail") as string,
    encryption: fd.get("encryption") as "SSL" | "TLS" | "STARTTLS" | "NONE",
    supportEmail: fd.get("supportEmail") as string,
    ticketNotificationEmail: fd.get("ticketNotificationEmail") as string,
    customOrderEmail: fd.get("customOrderEmail") as string,
    paymentNotificationEmail: fd.get("paymentNotificationEmail") as string,
    adminNotificationEmail: fd.get("adminNotificationEmail") as string,
    contactFormEmail: fd.get("contactFormEmail") as string,
    fallbackSesEnabled: fd.get("fallbackSesEnabled") === "on",
    fallbackSesHost: fd.get("fallbackSesHost") as string,
    fallbackSesPort: Number(fd.get("fallbackSesPort") || 587),
    fallbackSesUser: fd.get("fallbackSesUser") as string,
    fallbackSesPassword: (fd.get("fallbackSesPassword") as string) || undefined,
    fallbackSesEncryption: fd.get("fallbackSesEncryption") as "SSL" | "TLS" | "STARTTLS" | "NONE",
    fallbackBrevoEnabled: fd.get("fallbackBrevoEnabled") === "on",
    fallbackBrevoHost: fd.get("fallbackBrevoHost") as string,
    fallbackBrevoPort: Number(fd.get("fallbackBrevoPort") || 587),
    fallbackBrevoUser: fd.get("fallbackBrevoUser") as string,
    fallbackBrevoPassword: (fd.get("fallbackBrevoPassword") as string) || undefined,
    fallbackBrevoEncryption: fd.get("fallbackBrevoEncryption") as "SSL" | "TLS" | "STARTTLS" | "NONE",
  };
}

/** Feld mit sichtbarem Label. */
function Field({ id, label, className, children }: { id: string; label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="label-text">{label}</label>
      {children}
    </div>
  );
}

const selectClass = cn(controlClassName, "h-9");

export function EmailSettingsPanel({
  settings,
  logs,
  locale,
}: {
  settings: EmailSettingsPublic;
  logs: EmailLog[];
  locale: string;
}) {
  const t = useTranslations("admin.ui.emailSettings");
  const tp = useTranslations("admin.panelEmailSettings");
  const appToast = useAppToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [testTo, setTestTo] = useState(settings.senderEmail || "");

  const encryptionOptions = (
    <>
      <option value="STARTTLS">{t("encryptionStarttls")}</option>
      <option value="TLS">{t("encryptionTls")}</option>
      <option value="SSL">{t("encryptionSsl")}</option>
      <option value="NONE">{t("encryptionNone")}</option>
    </>
  );

  const checkbox = (name: string, label: string, checked: boolean) => (
    <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
      <input type="checkbox" name={name} defaultChecked={checked} /> {label}
    </label>
  );

  const groupTitle = (label: string) => (
    <h3 className="border-t border-line pt-4 text-sm font-semibold text-ink sm:col-span-2">{label}</h3>
  );

  const columns: DataColumn<EmailLog>[] = [
    {
      key: "subject",
      header: tp("colMessage"),
      width: "minmax(0,3fr)",
      cell: (log) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{log.subject}</p>
          <p className="meta truncate">{log.to}</p>
          {log.error && <p className="text-xs text-danger">{log.error}</p>}
        </div>
      ),
    },
    {
      key: "status",
      header: tp("colStatus"),
      width: "130px",
      cell: (log) => (
        <StatusBadge
          tone={LOG_TONE[log.status] ?? "neutral"}
          label={LOG_TONE[log.status] ? tp(`logStatus.${log.status}`) : log.status}
        />
      ),
    },
    {
      key: "createdAt",
      header: tp("colCreated"),
      width: "150px",
      hideOnMobile: true,
      cell: (log) => <span className="meta tabular-nums">{formatDateTime(log.createdAt, locale)}</span>,
    },
    {
      key: "action",
      header: tp("colAction"),
      width: "130px",
      align: "right",
      cell: (log) =>
        log.status === "FAILED" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await retryAdminEmailLog(log.id);
                if (r.success) router.refresh();
                else appToast.error(r.error);
              })
            }
          >
            {t("retry")}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <SectionCard
        title={t("title")}
        description={t("providerChainHint")}
        action={
          <StatusBadge
            tone={settings.configured ? "success" : "warning"}
            label={settings.configured ? t("configured") : t("notConfigured")}
          />
        }
      >
        <form
          ref={formRef}
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const r = await updateAdminEmailSettings(readEmailForm(e.currentTarget));
              if (r.success) {
                appToast.saved();
                router.refresh();
              } else appToast.error(r.error);
            });
          }}
        >
          {checkbox("enabled", t("enableOutboundEmail"), settings.enabled)}
          <Field id="email-auth-mode" label={tp("authMode")} className="sm:col-span-2">
            <select id="email-auth-mode" name="authMode" defaultValue={settings.authMode ?? "smtp"} className={selectClass}>
              <option value="smtp">{t("authModeSmtp")}</option>
              <option value="microsoft">{t("authModeMicrosoft")}</option>
              <option value="graph">{t("authModeGraph")}</option>
            </select>
          </Field>
          <Field id="email-smtp-host" label={t("smtpHostPlaceholder")}>
            <Input id="email-smtp-host" name="smtpHost" defaultValue={settings.smtpHost} />
          </Field>
          <Field id="email-smtp-port" label={t("portPlaceholder")}>
            <Input id="email-smtp-port" name="smtpPort" type="number" defaultValue={settings.smtpPort} className="tabular-nums" />
          </Field>
          <Field id="email-smtp-user" label={t("smtpUserPlaceholder")}>
            <Input id="email-smtp-user" name="smtpUser" defaultValue={settings.smtpUser} />
          </Field>
          <Field id="email-smtp-password" label={t("smtpPasswordPlaceholder")}>
            <Input
              id="email-smtp-password"
              name="smtpPassword"
              type="password"
              placeholder={settings.smtpPasswordSet ? t("unchangedPlaceholder") : undefined}
            />
          </Field>
          <Field id="email-ms-tenant" label={t("microsoftTenantIdPlaceholder")}>
            <Input id="email-ms-tenant" name="microsoftTenantId" defaultValue={settings.microsoftTenantId} className="mono-id" />
          </Field>
          <Field id="email-ms-client" label={t("microsoftClientIdPlaceholder")}>
            <Input id="email-ms-client" name="microsoftClientId" defaultValue={settings.microsoftClientId} className="mono-id" />
          </Field>
          <Field id="email-ms-secret" label={t("microsoftClientSecretPlaceholder")}>
            <Input
              id="email-ms-secret"
              name="microsoftClientSecret"
              type="password"
              placeholder={settings.microsoftSecretSet ? t("unchangedPlaceholder") : undefined}
            />
          </Field>
          <Field id="email-sender" label={t("senderEmailPlaceholder")}>
            <Input id="email-sender" name="senderEmail" type="email" defaultValue={settings.senderEmail} />
          </Field>
          <Field id="email-sender-name" label={t("senderNamePlaceholder")}>
            <Input id="email-sender-name" name="senderName" defaultValue={settings.senderName} />
          </Field>
          <Field id="email-reply-to" label={t("replyToPlaceholder")}>
            <Input id="email-reply-to" name="replyToEmail" type="email" defaultValue={settings.replyToEmail ?? ""} />
          </Field>
          <Field id="email-encryption" label={tp("encryption")}>
            <select id="email-encryption" name="encryption" defaultValue={settings.encryption} className={selectClass}>
              {encryptionOptions}
            </select>
          </Field>

          {groupTitle(t("fallbackSesTitle"))}
          {checkbox("fallbackSesEnabled", t("enableSesFallback"), settings.fallbackSes.enabled)}
          <Field id="email-ses-host" label={tp("smtpHost")}>
            <Input id="email-ses-host" name="fallbackSesHost" defaultValue={settings.fallbackSes.smtpHost} placeholder={tp("sesHostPlaceholder")} />
          </Field>
          <Field id="email-ses-port" label={t("portPlaceholder")}>
            <Input id="email-ses-port" name="fallbackSesPort" type="number" defaultValue={settings.fallbackSes.smtpPort} placeholder={tp("portExample")} className="tabular-nums" />
          </Field>
          <Field id="email-ses-user" label={t("sesUserPlaceholder")}>
            <Input id="email-ses-user" name="fallbackSesUser" defaultValue={settings.fallbackSes.smtpUser} />
          </Field>
          <Field id="email-ses-password" label={t("sesPasswordPlaceholder")}>
            <Input
              id="email-ses-password"
              name="fallbackSesPassword"
              type="password"
              placeholder={settings.fallbackSes.passwordSet ? t("unchangedPlaceholder") : undefined}
            />
          </Field>
          <Field id="email-ses-encryption" label={tp("encryption")} className="sm:col-span-2">
            <select id="email-ses-encryption" name="fallbackSesEncryption" defaultValue={settings.fallbackSes.encryption} className={selectClass}>
              {encryptionOptions}
            </select>
          </Field>

          {groupTitle(t("fallbackBrevoTitle"))}
          {checkbox("fallbackBrevoEnabled", t("enableBrevoFallback"), settings.fallbackBrevo.enabled)}
          <Field id="email-brevo-host" label={tp("smtpHost")}>
            <Input id="email-brevo-host" name="fallbackBrevoHost" defaultValue={settings.fallbackBrevo.smtpHost} placeholder={tp("brevoHostPlaceholder")} />
          </Field>
          <Field id="email-brevo-port" label={t("portPlaceholder")}>
            <Input id="email-brevo-port" name="fallbackBrevoPort" type="number" defaultValue={settings.fallbackBrevo.smtpPort} placeholder={tp("portExample")} className="tabular-nums" />
          </Field>
          <Field id="email-brevo-user" label={t("brevoUserPlaceholder")}>
            <Input id="email-brevo-user" name="fallbackBrevoUser" defaultValue={settings.fallbackBrevo.smtpUser} />
          </Field>
          <Field id="email-brevo-password" label={t("brevoPasswordPlaceholder")}>
            <Input
              id="email-brevo-password"
              name="fallbackBrevoPassword"
              type="password"
              placeholder={settings.fallbackBrevo.passwordSet ? t("unchangedPlaceholder") : undefined}
            />
          </Field>
          <Field id="email-brevo-encryption" label={tp("encryption")} className="sm:col-span-2">
            <select id="email-brevo-encryption" name="fallbackBrevoEncryption" defaultValue={settings.fallbackBrevo.encryption} className={selectClass}>
              {encryptionOptions}
            </select>
          </Field>

          {groupTitle(t("notificationTargetsTitle"))}
          <Field id="email-support" label={t("supportEmailPlaceholder")}>
            <Input id="email-support" name="supportEmail" type="email" defaultValue={settings.supportEmail} />
          </Field>
          <Field id="email-tickets" label={t("ticketNotificationPlaceholder")}>
            <Input id="email-tickets" name="ticketNotificationEmail" type="email" defaultValue={settings.ticketNotificationEmail} />
          </Field>
          <Field id="email-orders" label={t("customOrderEmailPlaceholder")}>
            <Input id="email-orders" name="customOrderEmail" type="email" defaultValue={settings.customOrderEmail} />
          </Field>
          <Field id="email-payments" label={t("paymentNotificationPlaceholder")}>
            <Input id="email-payments" name="paymentNotificationEmail" type="email" defaultValue={settings.paymentNotificationEmail} />
          </Field>
          <Field id="email-admin" label={t("adminNotificationPlaceholder")}>
            <Input id="email-admin" name="adminNotificationEmail" type="email" defaultValue={settings.adminNotificationEmail} />
          </Field>
          <Field id="email-contact" label={t("contactFormEmailPlaceholder")}>
            <Input id="email-contact" name="contactFormEmail" type="email" defaultValue={settings.contactFormEmail} />
          </Field>

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={pending}>{t("saveSettings")}</Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                const form = formRef.current;
                if (!form) return;
                startTransition(async () => {
                  const r = await testAdminEmailConnection(readEmailForm(form));
                  if (r.success) appToast.saved();
                  else appToast.error(r.error);
                });
              }}
            >
              {t("validateConnection")}
            </Button>
          </div>
        </form>

        <div className="mt-6 border-t border-line pt-4">
          <Field id="email-test-to" label={t("testRecipientPlaceholder")}>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="email-test-to"
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                className="max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                disabled={pending || !testTo}
                onClick={() =>
                  startTransition(async () => {
                    const r = await sendAdminTestEmail(testTo);
                    if (r.success) appToast.saved();
                    else appToast.error(r.error);
                  })
                }
              >
                {t("sendTestEmail")}
              </Button>
            </div>
          </Field>
        </div>
      </SectionCard>

      <section className="space-y-3">
        <h2 className="section-title">{t("emailLogsTitle")}</h2>
        <DataTable
          caption={t("emailLogsTitle")}
          columns={columns}
          rows={logs}
          rowKey={(log) => log.id}
          empty={<EmptyState icon={Mail} title={t("noEmailLogs")} />}
        />
      </section>
    </div>
  );
}
