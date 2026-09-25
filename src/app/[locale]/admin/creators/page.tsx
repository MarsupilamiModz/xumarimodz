import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listCreators } from "@/actions/admin/creators";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { PublisherTable } from "@/components/admin/publisher-table";
import { Button } from "@/components/ui/button";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { Pagination } from "@/components/ui/pagination";
import { SearchField } from "@/components/ui/search-field";
import type { Locale } from "@/i18n/config";

type Params = { q?: string; visibility?: string; page?: string };

export default async function AdminCreatorsPage({ params: { locale }, searchParams }: { params: { locale: Locale }; searchParams: Params }) {
  setRequestLocale(locale);
  await requirePagePermission("users.read");
  const t = await getTranslations("admin.pc");
  const q = searchParams.q?.trim().slice(0, 100) || undefined;
  const visibility = searchParams.visibility === "public" || searchParams.visibility === "hidden" ? searchParams.visibility : "all";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const base = `/${locale}/admin/creators`;
  const href = (next: Partial<Params>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, visibility: visibility === "all" ? undefined : visibility, ...next })) if (v) p.set(k, String(v));
    const s = p.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };

  const result = await listCreators({ search: q, page, visibility });
  const userIds = result.success ? result.data.creators.map((c) => c.userId) : [];
  // Offene Provisionen je Nutzer in einer Abfrage (kein N+1).
  const open = userIds.length
    ? await prisma.commissionEntry.groupBy({ by: ["userId"], where: { userId: { in: userIds }, status: "PENDING" }, _sum: { amountCents: true } })
    : [];
  const openMap = new Map(open.map((o) => [o.userId, o._sum.amountCents ?? 0]));

  return (
    <div>
      <AdminPageHeader
        title={t("creators")}
        description={result.success ? `${t("creatorsSub")} ${t("count", { count: result.data.total })}` : t("creatorsSub")}
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href={`${base}/visibility`}>{t("visibleOrder")}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`${base}/new`}>{t("create")}</Link>
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ChipTabs
          label={t("visibility")}
          value={visibility}
          options={[
            { value: "all", label: t("all") },
            { value: "public", label: t("public") },
            { value: "hidden", label: t("hidden") },
          ]}
          hrefFor={(v) => href({ visibility: v === "all" ? undefined : v, page: undefined })}
        />
        <form method="get" action={base} className="w-full max-w-sm">
          {visibility !== "all" && <input type="hidden" name="visibility" value={visibility} />}
          <SearchField label={t("search")} name="q" defaultValue={q} />
        </form>
      </div>
      {!result.success ? (
        <AdminLoadError message={result.error} />
      ) : (
        <>
          <PublisherTable
            kind="creator"
            locale={locale}
            basePath={base}
            rows={result.data.creators.map((c) => ({
              id: c.id,
              name: c.user.displayName ?? c.user.username,
              username: c.user.username,
              slug: c.slug,
              code: c.creatorCode,
              isVerified: c.isVerified,
              isPublic: c.isPublic,
              isSuspended: c.isSuspended || c.user.isBanned,
              shareBps: c.commissionOverrideBps ?? c.commissionRateBps,
              overridden: c.commissionOverrideBps != null,
              revenueCents: c.totalRevenueCents,
              openCents: openMap.get(c.userId) ?? 0,
            }))}
          />
          <Pagination className="mt-6" page={result.data.page} pages={Math.max(1, result.data.pages)} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined })} />
        </>
      )}
    </div>
  );
}
