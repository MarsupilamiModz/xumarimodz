import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ChevronRight,
  CreditCard,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Mail,
  Megaphone,
  Palette,
  ShieldCheck,
  Users,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";

/** Übersicht aller Einstellungsbereiche (Ziel von „Einstellungen“ in der ACP-Sidebar). */
export default async function AdminSettingsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const t = await getTranslations("admin");
  const base = `/${locale}/admin`;

  const sections: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/branding", label: t("nav.content"), icon: Palette },
    { href: "/settings/media", label: t("nav.media"), icon: ImageIcon },
    { href: "/email", label: t("nav.email"), icon: Mail },
    { href: "/email/templates", label: t("nav.emailTemplates"), icon: Mail },
    { href: "/payments", label: t("nav.shopOverview"), icon: CreditCard },
    { href: "/ads", label: t("nav.ads"), icon: Megaphone },
    { href: "/localization", label: t("nav.localization"), icon: Globe },
    { href: "/groups", label: t("nav.groups"), icon: Users },
    { href: "/security", label: t("nav.security"), icon: ShieldCheck },
    { href: "/api-keys", label: t("nav.apiKeys"), icon: KeyRound },
    { href: "/system", label: t("nav.system"), icon: Activity },
  ];

  return (
    <div>
      <AdminPageHeader title={t("nav.settings")} />
      {/* TODO(backend): Schalter für den Wartungsmodus (siehe /maintenance) gehört hierher. */}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={`${base}${href}`}
              className="flex items-center gap-3 rounded-lg border border-line bg-raised p-4 transition-colors duration-fast hover:border-line-control"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-elevated text-ink-muted">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="flex-1 text-sm font-semibold text-ink">{label}</span>
              <ChevronRight className="h-4 w-4 text-ink-faint" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
