import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, SectionCard } from "@/components/ui/page-header";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { SITE } from "@/lib/site";
import type { Locale } from "@/i18n/config";

type Endpoint = { method: string; path: string; scope: string };

export default async function DevelopersPage(
  props: {
    params: Promise<{ locale: Locale }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("publicPages.developers");

  const endpoints: Endpoint[] = [
    { method: "GET", path: "/api/v1/mods?q=&game=&page=1", scope: "mods:read" },
    { method: "GET", path: "/api/v1/mods/{slug}", scope: "mods:read" },
    { method: "GET", path: "/api/v1/games", scope: "games:read" },
    { method: "GET", path: "/api/v1/collections", scope: "collections:read" },
    { method: "GET", path: "/api/v1/collections/{slug}", scope: "collections:read" },
    { method: "GET", path: "/api/v1/creators/{slug}", scope: "creators:read" },
    { method: "GET", path: "/api/v1/download-meta?modId=&versionId=", scope: "downloads:meta" },
    { method: "POST", path: "/api/graphql", scope: "varies" },
  ];

  const columns: DataColumn<Endpoint>[] = [
    { key: "method", header: t("colMethod"), width: "80px", cell: (e) => <Badge variant="outline">{e.method}</Badge> },
    { key: "path", header: t("colPath"), width: "minmax(0,2fr)", cell: (e) => <code className="mono-id break-all text-ink">{e.path}</code> },
    {
      key: "scope",
      header: t("colScope"),
      hideOnMobile: true,
      cell: (e) => <span className="mono-id">{e.scope === "varies" ? t("scopeVaries") : e.scope}</span>,
    },
  ];

  const code = "rounded-sm bg-elevated px-1 py-0.5 font-mono text-xs text-ink";

  return (
    <div className="page-section">
      <div className="max-w-4xl space-y-6">
        <PageHeader className="mb-0" title={t("title")} description={t("subtitle", { site: SITE.name })} />

        <SectionCard title={t("authTitle")}>
          <div className="space-y-3 text-sm text-ink-muted">
            <p>{t("authText")}</p>
            <code className="block rounded-md bg-elevated p-3 font-mono text-xs text-ink">
              Authorization: Bearer xm_&lt;your_api_key&gt;
            </code>
            <p>{t("authHint")}</p>
          </div>
        </SectionCard>

        <SectionCard title={t("desktopTitle")}>
          <div className="space-y-2 text-sm text-ink-muted">
            <p>{t.rich("desktopMeta", { path: "/api/v1/download-meta", code: (c) => <code className={code}>{c}</code> })}</p>
            <p>{t.rich("desktopDeps", { path: "/api/v1/mods/{slug}", code: (c) => <code className={code}>{c}</code> })}</p>
            <p>{t("desktopCollections")}</p>
          </div>
        </SectionCard>

        <section aria-labelledby="dev-endpoints" className="space-y-3">
          <h2 id="dev-endpoints" className="section-title">{t("endpointsTitle")}</h2>
          <DataTable caption={t("endpointsTitle")} columns={columns} rows={endpoints} rowKey={(e) => `${e.method} ${e.path}`} />
        </section>

        <SectionCard title={t("graphqlTitle")}>
          <div className="space-y-3 text-sm text-ink-muted">
            <p>{t.rich("graphqlText", { path: "/api/graphql", code: (c) => <code className={code}>{c}</code> })}</p>
            <pre className="overflow-x-auto rounded-md bg-elevated p-3 font-mono text-xs text-ink">{`{
  "query": "query { mods }",
  "variables": { "q": "redux", "page": 1 }
}`}</pre>
            <p>{t("graphqlRoots")}</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
