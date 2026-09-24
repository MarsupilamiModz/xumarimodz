import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getDesignerDashboard } from "@/actions/designer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";

export default async function DesignerUploadsPage({ params: { locale } }: { params: { locale: Locale } }) {
  const t = await getTranslations("designer");
  const result = await getDesignerDashboard();
  const uploads = result.success ? result.data.uploads : [];

  return (
    <div>
      <div className="flex justify-between items-center gap-4">
        <h1 className="h1-acp">{t("uploads")}</h1>
        <Button size="sm" asChild>
          <Link href={`/${locale}/designer/new`}>{t("newAsset")}</Link>
        </Button>
      </div>

      <div className="mt-8 space-y-3">
        {uploads.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">{t("emptyUploads")}</Card>
        ) : (
          uploads.map((m) => (
            <Link key={m.id} href={`/${locale}/designer/assets/${m.id}`}>
              <Card className="p-4 hover:border-line-control transition-colors">
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {m.game.name} · {m._count.downloads} downloads · {m._count.versions} versions
                    </p>
                  </div>
                  <Badge variant="outline">{m.status}</Badge>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
