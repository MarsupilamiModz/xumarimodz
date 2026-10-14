import Link from "next/link";
import { Gamepad2, Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { getAdminGames } from "@/actions/admin/games";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { AdminGamesList } from "@/components/admin/admin-games-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/i18n/config";

export default async function AdminGamesPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("games.write");
  const [t, result] = await Promise.all([getTranslations("admin.gamesAdmin"), getAdminGames()]);
  const newHref = `/${locale}/admin/games/new`;

  return (
    <div>
      <AdminPageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button asChild>
            <Link href={newHref}>
              <Plus className="h-4 w-4" aria-hidden /> {t("add")}
            </Link>
          </Button>
        }
      />

      {!result.success ? (
        <AdminLoadError message={result.error} />
      ) : result.data.length === 0 ? (
        <EmptyState icon={Gamepad2} title={t("emptyTitle")} description={t("emptyText")} />
      ) : (
        <AdminGamesList locale={locale} games={result.data} />
      )}
    </div>
  );
}
