import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/lib/auth";
import { AdminIntlProvider } from "@/components/i18n/admin-intl-provider";
import { userHasPermission } from "@/lib/permission-store";
import { formatDisplayName } from "@/lib/display-name";
import type { PermissionKey } from "@/lib/permissions";
import { AcpNav, type AcpNavGroup, type AcpNavLink } from "@/components/admin/acp-nav";
import { getAdminNavCounts, type AdminNavCounts } from "@/lib/admin-nav-counts";
import { formatRoleLabel } from "@/lib/role-display";

type LinkDef = { href: string; key: string; permission: PermissionKey };

/** ACP-Navigation nach Spezifikation: Allgemein, Shop, Webseite – alle übrigen Bereiche unter „Weitere“. */
const NAV: { id: "general" | "shop" | "website" | "more"; links: LinkDef[] }[] = [
  {
    id: "general",
    links: [
      { href: "", key: "dashboard", permission: "analytics.read" },
      { href: "/mods", key: "mods", permission: "mods.read" },
      { href: "/games", key: "games", permission: "games.write" },
      { href: "/users", key: "users", permission: "users.read" },
      { href: "/reports", key: "reports", permission: "moderation.reports" },
      { href: "/settings", key: "settings", permission: "settings.write" },
    ],
  },
  {
    id: "shop",
    links: [
      { href: "/payments", key: "shopOverview", permission: "settings.write" },
      { href: "/shop", key: "products", permission: "settings.write" },
      { href: "/orders", key: "orders", permission: "orders.read" },
      { href: "/coupons", key: "coupons", permission: "coupons.write" },
      { href: "/subscriptions", key: "subscriptions", permission: "subscriptions.read" },
      { href: "/memberships", key: "memberships", permission: "settings.write" },
      { href: "/licenses", key: "licenses", permission: "licenses.write" },
    ],
  },
  {
    id: "website",
    links: [
      { href: "/branding", key: "content", permission: "settings.write" },
      { href: "/announcements", key: "announcements", permission: "settings.write" },
      { href: "/partners", key: "partners", permission: "users.read" },
      { href: "/creators", key: "creators", permission: "users.read" },
      { href: "/applications", key: "applications", permission: "users.read" },
      { href: "/commissions", key: "commissions", permission: "settings.write" },
      { href: "/collections", key: "collections", permission: "settings.write" },
    ],
  },
  {
    id: "more",
    links: [
      { href: "/tickets", key: "tickets", permission: "tickets.read" },
      { href: "/analytics", key: "analytics", permission: "analytics.read" },
      { href: "/audit", key: "audit", permission: "audit.read" },
      { href: "/achievements", key: "achievements", permission: "settings.write" },
      { href: "/leaderboards", key: "leaderboards", permission: "settings.write" },
      { href: "/ads", key: "ads", permission: "settings.write" },
      { href: "/email", key: "email", permission: "settings.write" },
      { href: "/email/templates", key: "emailTemplates", permission: "settings.write" },
      { href: "/groups", key: "groups", permission: "settings.write" },
      { href: "/localization", key: "localization", permission: "settings.write" },
      { href: "/settings/media", key: "media", permission: "settings.write" },
      { href: "/system", key: "system", permission: "settings.write" },
      { href: "/security", key: "security", permission: "settings.write" },
      { href: "/api-keys", key: "apiKeys", permission: "settings.write" },
    ],
  },
];

export default async function AdminLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  const {
    children
  } = props;

  setRequestLocale(locale);
  const user = await requireStaff();
  const t = await getTranslations("admin");

  // Rechte parallel prüfen; nur erlaubte Bereiche anzeigen.
  const allowed = await Promise.all(
    NAV.flatMap((g) => g.links).map((l) =>
      userHasPermission(user, l.permission).catch(() => false)
    )
  );
  const counts: AdminNavCounts = await getAdminNavCounts().catch(() => ({
    mods: 0,
    users: 0,
    openApplications: 0,
    openTickets: 0,
    openReports: 0,
  }));
  // Zähler rechts im Menü; offene Vorgänge gelb.
  const countFor = (href: string): Pick<AcpNavLink, "count" | "countTone"> => {
    switch (href) {
      case "/mods":
        return { count: counts.mods };
      case "/users":
        return { count: counts.users };
      case "/applications":
        return { count: counts.openApplications, countTone: "warning" };
      case "/tickets":
        return { count: counts.openTickets, countTone: "warning" };
      case "/reports":
        return { count: counts.openReports, countTone: "warning" };
      default:
        return {};
    }
  };

  let i = 0;
  const groups: AcpNavGroup[] = NAV.map((g) => ({
    id: g.id,
    title: t(`navGroup.${g.id}`),
    links: g.links
      .filter(() => allowed[i++])
      .map((l) => ({ href: l.href, label: t(`nav.${l.key}`), ...countFor(l.href) })),
  })).filter((g) => g.links.length > 0);

  return (
    <AdminIntlProvider locale={locale}>
    <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col lg:flex-row">
      <AcpNav
        groups={groups}
        base={`/${locale}/admin`}
        locale={locale}
        userName={formatDisplayName(user)}
        userRole={formatRoleLabel(user.role)}
        // Ticketzahl nur für Rollen mit Zugriff auf Tickets anzeigen.
        openTickets={groups.some((g) => g.links.some((l) => l.href === "/tickets")) ? counts.openTickets : 0}
      />
      <div className="min-w-0 flex-1 px-4 py-8 md:px-8 xl:px-10">{children}</div>
    </div>
    </AdminIntlProvider>
  );
}
