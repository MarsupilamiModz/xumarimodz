import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getCreatorExclusiveProgram } from "@/actions/exclusive";
import { ExclusiveProgramManager } from "@/components/exclusive/exclusive-program-manager";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";

export default async function CreatorExclusiveDetailPage(
  props: {
    params: Promise<{ locale: Locale; id: string }>;
  }
) {
  const params = await props.params;

  const {
    locale,
    id
  } = params;

  await requireAuth(`/${locale}/login`);
  const result = await getCreatorExclusiveProgram(id);
  if (!result.success) notFound();
  const tp = await getTranslations("creatorPages.exclusive");

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/${locale}/creator/exclusive`}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {tp("backToHub")}
        </Link>
      </Button>
      <ExclusiveProgramManager locale={locale} program={result.data} />
    </div>
  );
}
