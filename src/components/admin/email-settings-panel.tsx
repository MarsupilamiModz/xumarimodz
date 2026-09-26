"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  updateAdminEmailSettings,
  testAdminEmailConnection,
  sendAdminTestEmail,
  retryAdminEmailLog,
} from "@/actions/admin/email";
import type { EmailSettingsPublic } from "@/lib/email/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDateTime } from "@/lib/format-locale";

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
  const appToast = useAppToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [testTo, setTestTo] = useState(settings.senderEmail || "");

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">{t("title")}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t("providerChainHint")}</p>
          </div>
          <Badge variant={settings.configured ? "premium" : "outline"}>
            {settings.configured ? t("configured") : t("notConfigured")}
          </Badge>
        </div>

        <form
          ref={formRef}
          className="grid gap-3 sm:grid-cols-2"
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
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="enabled" defaultChecked={settings.enabled} /> {t("enableOutboundEmail")}
          </label>
          <select name="authMode" defaultValue={settings.authMode ?? "smtp"} className="h-10 rounded-md border border-input bg-background/50 px-3 text-sm sm:col-span-2">
            <option value="smtp">{t("authModeSmtp")}</option>
            <option value="microsoft">{t("authModeMicrosoft")}</option>
            <option value="graph">{t("authModeGraph")}</option>
          </select>
          <Input name="smtpHost" defaultValue={settings.smtpHost} placeholder={t("smtpHostPlaceholder")} />
          <Input name="smtpPort" type="number" defaultValue={settings.smtpPort} placeholder={t("portPlaceholder")} />
          <Input name="smtpUser" defaultValue={settings.smtpUser} placeholder={t("smtpUserPlaceholder")} />
          <Input name="smtpPassword" type="password" placeholder={settings.smtpPasswordSet ? t("unchangedPlaceholder") : t("smtpPasswordPlaceholder")} />
          <Input name="microsoftTenantId" defaultValue={settings.microsoftTenantId} placeholder={t("microsoftTenantIdPlaceholder")} />
          <Input name="microsoftClientId" defaultValue={settings.microsoftClientId} placeholder={t("microsoftClientIdPlaceholder")} />
          <Input
            name="microsoftClientSecret"
            type="password"
            placeholder={settings.microsoftSecretSet ? t("unchangedPlaceholder") : t("microsoftClientSecretPlaceholder")}
          />
          <Input name="senderEmail" type="email" defaultValue={settings.senderEmail} placeholder={t("senderEmailPlaceholder")} />
          <Input name="senderName" defaultValue={settings.senderName} placeholder={t("senderNamePlaceholder")} />
          <Input name="replyToEmail" type="email" defaultValue={settings.replyToEmail ?? ""} placeholder={t("replyToPlaceholder")} />
          <select name="encryption" defaultValue={settings.encryption} className="h-10 rounded-md border border-input bg-background/50 px-3 text-sm">
            <option value="STARTTLS">{t("encryptionStarttls")}</option>
            <option value="TLS">{t("encryptionTls")}</option>
            <option value="SSL">{t("encryptionSsl")}</option>
            <option value="NONE">{t("encryptionNone")}</option>
          </select>

          <div className="sm:col-span-2 pt-2 border-t border-border/40">
            <p className="text-sm font-medium mb-2">{t("fallbackSesTitle")}</p>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="fallbackSesEnabled" defaultChecked={settings.fallbackSes.enabled} /> {t("enableSesFallback")}
          </label>
          <Input name="fallbackSesHost" defaultValue={settings.fallbackSes.smtpHost} placeholder="email-smtp.region.amazonaws.com" />
          <Input name="fallbackSesPort" type="number" defaultValue={settings.fallbackSes.smtpPort} placeholder="587" />
          <Input name="fallbackSesUser" defaultValue={settings.fallbackSes.smtpUser} placeholder={t("sesUserPlaceholder")} />
          <Input
            name="fallbackSesPassword"
            type="password"
            placeholder={settings.fallbackSes.passwordSet ? t("unchangedPlaceholder") : t("sesPasswordPlaceholder")}
          />
          <select name="fallbackSesEncryption" defaultValue={settings.fallbackSes.encryption} className="h-10 rounded-md border border-input bg-background/50 px-3 text-sm sm:col-span-2">
            <option value="STARTTLS">{t("encryptionStarttls")}</option>
            <option value="TLS">{t("encryptionTls")}</option>
            <option value="SSL">{t("encryptionSsl")}</option>
            <option value="NONE">{t("encryptionNone")}</option>
          </select>

          <div className="sm:col-span-2 pt-2 border-t border-border/40">
            <p className="text-sm font-medium mb-2">{t("fallbackBrevoTitle")}</p>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="fallbackBrevoEnabled" defaultChecked={settings.fallbackBrevo.enabled} /> {t("enableBrevoFallback")}
          </label>
          <Input name="fallbackBrevoHost" defaultValue={settings.fallbackBrevo.smtpHost} placeholder="smtp-relay.brevo.com" />
          <Input name="fallbackBrevoPort" type="number" defaultValue={settings.fallbackBrevo.smtpPort} placeholder="587" />
          <Input name="fallbackBrevoUser" defaultValue={settings.fallbackBrevo.smtpUser} placeholder={t("brevoUserPlaceholder")} />
          <Input
            name="fallbackBrevoPassword"
            type="password"
            placeholder={settings.fallbackBrevo.passwordSet ? t("unchangedPlaceholder") : t("brevoPasswordPlaceholder")}
          />
          <select name="fallbackBrevoEncryption" defaultValue={settings.fallbackBrevo.encryption} className="h-10 rounded-md border border-input bg-background/50 px-3 text-sm sm:col-span-2">
            <option value="STARTTLS">{t("encryptionStarttls")}</option>
            <option value="TLS">{t("encryptionTls")}</option>
            <option value="SSL">{t("encryptionSsl")}</option>
            <option value="NONE">{t("encryptionNone")}</option>
          </select>

          <div className="sm:col-span-2 pt-2 border-t border-border/40">
            <p className="text-sm font-medium mb-2">{t("notificationTargetsTitle")}</p>
          </div>
          <Input name="supportEmail" type="email" defaultValue={settings.supportEmail} placeholder={t("supportEmailPlaceholder")} />
          <Input name="ticketNotificationEmail" type="email" defaultValue={settings.ticketNotificationEmail} placeholder={t("ticketNotificationPlaceholder")} />
          <Input name="customOrderEmail" type="email" defaultValue={settings.customOrderEmail} placeholder={t("customOrderEmailPlaceholder")} />
          <Input name="paymentNotificationEmail" type="email" defaultValue={settings.paymentNotificationEmail} placeholder={t("paymentNotificationPlaceholder")} />
          <Input name="adminNotificationEmail" type="email" defaultValue={settings.adminNotificationEmail} placeholder={t("adminNotificationPlaceholder")} />
          <Input name="contactFormEmail" type="email" defaultValue={settings.contactFormEmail} placeholder={t("contactFormEmailPlaceholder")} />

          <div className="sm:col-span-2 flex flex-wrap gap-2">
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

        <div className="flex flex-wrap gap-2 items-end pt-2 border-t border-border/40">
          <Input
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder={t("testRecipientPlaceholder")}
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
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">{t("emailLogsTitle")}</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEmailLogs")}</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-wrap justify-between gap-2 text-sm border-b border-border/30 py-2 last:border-0">
                <div className="min-w-0">
                  <p className="font-medium truncate">{log.subject}</p>
                  <p className="text-xs text-muted-foreground">{log.to}</p>
                  {log.error && <p className="text-xs text-destructive">{log.error}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={log.status === "SENT" ? "premium" : log.status === "FAILED" ? "destructive" : "outline"}>
                    {log.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt, locale)}</span>
                  {log.status === "FAILED" && (
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
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
