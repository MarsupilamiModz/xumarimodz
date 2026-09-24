import { requireAuth } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Download,
  Heart,
  LayoutDashboard,
  Key,
  Settings,
  Bell,
  CreditCard,
  LifeBuoy,
  Package,
  Coins,
  Users,
  BookOpen,
  Trophy,
} from "lucide-react";
import { formatRoleLabel } from "@/lib/role-display";
import { AdLocationSlot } from "@/components/ads/ad-location-slot";
import { SectionNav } from "@/components/layout/section-nav";

const navDefs = [
  { href: "", icon: LayoutDashboard, labelKey: "overview" },
  { href: "/achievements", icon: Trophy, labelKey: "achievements" },
  { href: "/support", icon: LifeBuoy, labelKey: "support" },
  { href: "/orders", icon: Package, labelKey: "customOrders" },
  { href: "/library", icon: BookOpen, labelKey: "library" },
  { href: "/following", icon: Users, labelKey: "following" },
  { href: "/downloads", icon: Download, labelKey: "downloads" },
  { href: "/favorites", icon: Heart, labelKey: "favorites" },
  { href: "/subscription", icon: CreditCard, labelKey: "membership" },
  { href: "/licenses", icon: Key, labelKey: "licenses" },
  { href: "/notifications", icon: Bell, labelKey: "notifications" },
  { href: "/settings", icon: Settings, labelKey: "settings" },
] as const;

export default async function DashboardLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const [user, t] = await Promise.all([
    requireAuth(`/${locale}/login`),
    getTranslations("dashboard"),
  ]);

  const navWithShop = [
    ...navDefs.map((item) => ({ ...item, dashboard: true as const })),
    { href: `/${locale}/shop`, icon: Coins, labelKey: "shop" as const, dashboard: false as const },
  ];

  const items = navWithShop.map((item) => ({
    href: item.dashboard ? `/${locale}/dashboard${item.href}` : item.href,
    label: t(item.labelKey),
    icon: item.icon,
    exact: item.dashboard && item.href === "",
  }));

  return (
    <div className="page-container flex flex-col gap-6 py-8 lg:flex-row lg:gap-10">
      <aside className="shrink-0 lg:w-56">
        <div className="lg:sticky lg:top-[calc(var(--header-height)+2rem)]">
          <div className="mb-4 hidden lg:block">
            <p className="truncate font-semibold text-ink">{user.displayName ?? user.username}</p>
            <p className="meta">{formatRoleLabel(user.role)}</p>
          </div>
          <SectionNav items={items} label={t("title")} />
        </div>
      </aside>
      <div className="min-w-0 flex-1 space-y-4">
        <AdLocationSlot location="dashboard" />
        {children}
      </div>
    </div>
  );
}
