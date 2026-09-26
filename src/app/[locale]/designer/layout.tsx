import { requireDesigner } from "@/lib/auth";
import { AdminIntlProvider } from "@/components/i18n/admin-intl-provider";
import { Palette, Package, MessageSquare, BarChart3, Plus } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { getTranslations } from "next-intl/server";

import { formatDisplayName } from "@/lib/display-name";
import { Settings } from "lucide-react";
import { SectionNav } from "@/components/layout/section-nav";

const nav = [
  { href: "", icon: BarChart3, labelKey: "analytics" as const },
  { href: "/uploads", icon: Package, labelKey: "uploads" as const },
  { href: "/orders", icon: MessageSquare, labelKey: "orders" as const },
  { href: "/settings", icon: Settings, labelKey: "settings" as const },
  { href: "/new", icon: Plus, labelKey: "newAsset" as const },
];

export default async function DesignerLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  const user = await requireDesigner();
  const t = await getTranslations("designer");

  const items = nav.map((item) => ({
    href: `/${locale}/designer${item.href}`,
    label: t(item.labelKey),
    icon: item.icon,
    exact: item.href === "",
  }));

  return (
    <AdminIntlProvider locale={locale}>
    <div className="page-container flex flex-col gap-6 py-8 lg:flex-row lg:gap-10">
      <aside className="shrink-0 lg:w-56">
        <div className="lg:sticky lg:top-[calc(var(--header-height)+2rem)]">
          <div className="mb-4 hidden lg:block">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <Palette className="h-4 w-4 text-ink-muted" aria-hidden />
              {t("title")}
            </p>
            <p className="meta truncate">{formatDisplayName(user)}</p>
          </div>
          <SectionNav items={items} label={t("title")} />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
    </AdminIntlProvider>
  );
}
