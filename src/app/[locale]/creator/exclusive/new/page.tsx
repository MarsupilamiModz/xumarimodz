import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getCreatorModsForExclusive } from "@/actions/exclusive";
import { ExclusiveProgramForm } from "@/components/exclusive/exclusive-program-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import type { Locale } from "@/i18n/config";

export default async function CreatorExclusiveNewPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  await requireAuth(`/${locale}/login`);
  const result = await getCreatorModsForExclusive();
  const mods = result.success ? result.data : [];
  const tp = await getTranslations("creatorPages.exclusive");

  return (
    <div>
      <PageHeader
        level="h2"
        title={tp("newTitle")}
        description={tp("newDescription")}
        actions={
          <Button variant="ghost" asChild>
            <Link href={`/${locale}/creator/exclusive`}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {tp("backToHub")}
            </Link>
          </Button>
        }
      />
      <ExclusiveProgramForm locale={locale} mods={mods} />
    </div>
  );
}
