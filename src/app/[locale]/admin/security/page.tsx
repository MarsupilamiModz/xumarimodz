import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format-locale";
import { getSecurityPolicy, getTeamSessions } from "@/lib/security-policy";
import { isTurnstileEnabled } from "@/lib/turnstile";
import { getMalwareSettingsAdmin, getSecurityDashboardStats } from "@/actions/admin/security";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { EndSessionButton, IpBanForm, PasswordRulesForm, UnbanButton } from "@/components/admin/account-security-tools";
import { SecurityCenterPanel } from "@/components/admin/security-center-panel";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Locale } from "@/i18n/config";

const TABS = ["accounts", "ips", "rules", "scan"] as const;
type Tab = (typeof TABS)[number];

function Section({ title, text, actions, children }: { title: string; text?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-raised">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-4">
        <div>
          <h2 className="section-title">{title}</h2>
          {text && <p className="mt-1 max-w-3xl text-sm text-ink-muted">{text}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Kurzform des User-Agents: Browser und System, ohne Versionsrauschen. */
function deviceLabel(ua: string | null) {
  if (!ua) return null;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : null;
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : null;
  return [browser, os].filter(Boolean).join(" · ") || ua.slice(0, 60);
}

export default async function AdminSecurityPage({ params: { locale }, searchParams }: { params: { locale: Locale }; searchParams: { tab?: string } }) {
  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const [t, tr, tl] = await Promise.all([getTranslations("admin.sc"), getTranslations("status.role"), getTranslations("admin.security")]);
  const tab: Tab = TABS.includes(searchParams.tab as Tab) ? (searchParams.tab as Tab) : "accounts";
  const base = `/${locale}/admin/security`;

  const tabs = (
    <ChipTabs
      label={t("tabs")}
      value={tab}
      options={[
        { value: "accounts", label: t("tabAccounts") },
        { value: "ips", label: t("tabIps") },
        { value: "rules", label: t("tabRules") },
        { value: "scan", label: t("tabScan") },
      ]}
      hrefFor={(v) => (v === "accounts" ? base : `${base}?tab=${v}`)}
    />
  );

  let body: React.ReactNode;

  if (tab === "accounts") {
    const [team, otherMissing, sessions] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ["OWNER", "ADMIN", "MODERATOR", "SUPPORT"] }, deletedAt: null },
        select: { id: true, username: true, role: true, mfaEnabled: true, mfaEnabledAt: true },
        orderBy: [{ mfaEnabled: "asc" }, { username: "asc" }],
      }),
      prisma.user.count({ where: { role: { in: ["CREATOR", "PARTNER", "DESIGNER"] }, deletedAt: null, mfaEnabled: false } }),
      getTeamSessions(),
    ]);
    body = (
      <div className="space-y-6">
        <Section title={t("mfaTitle")} text={t("mfaText")} actions={<StatusBadge tone="success" label={t("mfaAlwaysOn")} />}>
          <table className="w-full text-[13px]">
            <caption className="sr-only">{t("mfaTitle")}</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-faint">
                <th scope="col" className="px-4 py-2 font-medium">{t("colAccount")}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t("colRole")}</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">{t("col2fa")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {team.map((u) => (
                <tr key={u.id} className="hover:bg-row-hover">
                  <td className="px-4 py-2.5">
                    <a href={`/${locale}/admin/users/${u.id}`} className="text-ink hover:text-violet-bright">@{u.username}</a>
                  </td>
                  <td className="px-4 py-2.5 text-ink-muted">{tr(u.role)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="inline-flex items-center gap-2">
                      {u.mfaEnabled && u.mfaEnabledAt && <span className="text-xs text-ink-faint">{t("mfaSince", { date: formatDate(u.mfaEnabledAt, locale) })}</span>}
                      <StatusBadge tone={u.mfaEnabled ? "success" : "danger"} label={u.mfaEnabled ? t("mfaOn") : t("mfaOff")} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-3 text-xs text-ink-muted">{t("otherMissing", { count: otherMissing })}</p>
        </Section>

        <Section title={t("sessions")} text={t("sessionsText")}>
          {sessions === null ? (
            <p className="px-4 py-6 text-sm text-ink-muted">{t("sessionsUnavailable")}</p>
          ) : sessions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">{t("noSessions")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13px]">
                <caption className="sr-only">{t("sessions")}</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-faint">
                    <th scope="col" className="px-4 py-2 font-medium">{t("colAccount")}</th>
                    <th scope="col" className="px-4 py-2 font-medium">{t("colDevice")}</th>
                    <th scope="col" className="px-4 py-2 font-medium">{t("colIp")}</th>
                    <th scope="col" className="px-4 py-2 font-medium">{t("colLastActive")}</th>
                    <th scope="col" className="px-4 py-2"><span className="sr-only">{t("endSession")}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-row-hover">
                      <td className="px-4 py-2">
                        @{s.user.username} <span className="text-xs text-ink-faint">· {tr(s.user.role)}</span>
                      </td>
                      <td className="px-4 py-2 text-ink-muted">{deviceLabel(s.userAgent) ?? t("unknownDevice")}</td>
                      <td className="mono-id px-4 py-2 text-ink-faint">{s.ipMasked}</td>
                      <td className="px-4 py-2 tabular-nums text-ink-muted">{formatDateTime(s.lastActiveAt ?? s.createdAt, locale)}</td>
                      <td className="px-4 py-2 text-right">
                        <EndSessionButton sessionId={s.id} username={s.user.username} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    );
  } else if (tab === "ips") {
    const policy = await getSecurityPolicy();
    body = (
      <Section title={t("ipTitle")} text={t("ipText")}>
        <div className="border-b border-line p-4">
          <IpBanForm />
        </div>
        {policy.ipBans.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">{t("noBans")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <caption className="sr-only">{t("ipTitle")}</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th scope="col" className="px-4 py-2 font-medium">{t("ip")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("colReason")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("colBannedBy")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("colDate")}</th>
                  <th scope="col" className="px-4 py-2"><span className="sr-only">{t("unban")}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {policy.ipBans.map((b) => (
                  <tr key={b.hash} className="hover:bg-row-hover">
                    <td className="mono-id px-4 py-2 text-ink">{b.masked}</td>
                    <td className="px-4 py-2 text-ink-muted">{b.reason ?? "—"}</td>
                    <td className="px-4 py-2 text-ink-muted">@{b.createdBy}</td>
                    <td className="px-4 py-2 tabular-nums text-ink-muted">{formatDate(b.createdAt, locale)}</td>
                    <td className="px-4 py-2 text-right">
                      <UnbanButton hash={b.hash} masked={b.masked} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    );
  } else if (tab === "rules") {
    const policy = await getSecurityPolicy();
    const captcha = isTurnstileEnabled();
    body = (
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Section title={t("passwordTitle")} text={t("passwordText")}>
          <div className="p-4">
            <PasswordRulesForm
              initial={{
                passwordMinLength: policy.passwordMinLength,
                passwordRequireNumber: policy.passwordRequireNumber,
                passwordRequireSymbol: policy.passwordRequireSymbol,
                passwordRequireMixedCase: policy.passwordRequireMixedCase,
              }}
            />
          </div>
        </Section>
        <Section title={t("captchaTitle")} actions={<StatusBadge tone={captcha ? "success" : "warning"} label={captcha ? t("statusOn") : t("statusOff")} />}>
          <p className="p-4 text-sm text-ink-muted">{captcha ? t("captchaOn") : t("captchaOff")}</p>
        </Section>
      </div>
    );
  } else {
    const [settingsResult, statsResult] = await Promise.all([getMalwareSettingsAdmin(), getSecurityDashboardStats()]);
    body =
      settingsResult.success && statsResult.success ? (
        <SecurityCenterPanel settings={settingsResult.data} stats={statsResult.data} />
      ) : (
        <AdminLoadError message={tl("subtitle")} />
      );
  }

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} actions={tabs} />
      {body}
    </div>
  );
}
