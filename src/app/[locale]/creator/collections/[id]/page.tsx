import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CollectionEditForm } from "@/components/creator/collection-editor";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function EditCollectionPage(
  props: {
    params: Promise<{ locale: Locale; id: string }>;
  }
) {
  const params = await props.params;

  const {
    locale,
    id
  } = params;

  setRequestLocale(locale);
  const user = await requireAuth(`/${locale}/login`);

  const collection = await prisma.modCollection.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { mod: { select: { id: true, slug: true, title: true } } },
      },
    },
  }).catch(() => null);

  if (!collection || collection.ownerId !== user.id) notFound();

  const [tp, te] = await Promise.all([
    getTranslations("creatorPages.collections"),
    getTranslations("common.cx.collectionEditor"),
  ]);

  return (
    <div>
      <PageHeader
        level="h2"
        title={collection.title}
        description={tp("editDescription")}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link href={`/${locale}/creator/collections`}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {tp("backToList")}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/${locale}/collections/${collection.slug}`}>
                <ExternalLink className="h-4 w-4" aria-hidden />
                {te("viewPublic")}
              </Link>
            </Button>
          </>
        }
      />
      <CollectionEditForm locale={locale} collection={collection} />
    </div>
  );
}
