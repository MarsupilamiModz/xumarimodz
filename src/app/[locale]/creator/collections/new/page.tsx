import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { CollectionCreateForm } from "@/components/creator/collection-editor";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import type { Locale } from "@/i18n/config";

export default async function NewCollectionPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requireAuth(`/${locale}/login`);
  const tp = await getTranslations("creatorPages.collections");

  return (
    <div>
      <PageHeader
        level="h2"
        title={tp("new")}
        description={tp("newDescription")}
        actions={
          <Button variant="ghost" asChild>
            <Link href={`/${locale}/creator/collections`}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {tp("backToList")}
            </Link>
          </Button>
        }
      />
      <CollectionCreateForm locale={locale} />
    </div>
  );
}
