import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/components/error/error-screen";

export default async function NotFoundPage() {
  // not-found bekommt keine params – Sprache aus dem Request lesen.
  const locale = await getLocale();
  const t = await getTranslations("common");

  return (
    <ErrorScreen
      icon={SearchX}
      label={t("errorCode", { code: 404 })}
      title={t("notFoundTitle")}
      description={t("notFoundHint")}
      actions={
        <>
          <Button asChild>
            <Link href={`/${locale}`}>{t("backHome")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/${locale}/mods`}>{t("browseMods")}</Link>
          </Button>
        </>
      }
    />
  );
}
