import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogIn } from "lucide-react";
import { getPublicExclusiveProgram, getUserExclusiveApplication } from "@/actions/exclusive";
import { getCurrentUser } from "@/lib/auth";
import { ExclusiveApplyForm } from "@/components/exclusive/exclusive-apply-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/i18n/config";

export default async function PublicExclusivePage(
  props: {
    params: Promise<{ locale: Locale; programId: string }>;
  }
) {
  const params = await props.params;

  const {
    locale,
    programId
  } = params;

  setRequestLocale(locale);
  const result = await getPublicExclusiveProgram(programId);
  if (!result.success) notFound();

  const user = await getCurrentUser();
  const appResult = user ? await getUserExclusiveApplication(programId) : null;
  const existingApplication = appResult?.success ? appResult.data : null;
  const t = await getTranslations("publicPages.exclusive");
  const program = result.data;

  return (
    <div className="page-section">
      <div className="max-w-2xl">
        <PageHeader
          title={program.title}
          description={t("byline", {
            mod: program.mod.title,
            game: program.mod.game.name,
            author: program.author.displayName ?? program.author.username,
          })}
        />
        {!user ? (
          <EmptyState
            icon={LogIn}
            title={t("signInTitle")}
            description={t("signInText")}
            action={
              <Button asChild>
                <Link href={`/${locale}/login?next=/${locale}/exclusive/${programId}`}>{t("signIn")}</Link>
              </Button>
            }
          />
        ) : (
          <ExclusiveApplyForm program={program} existingApplication={existingApplication} />
        )}
      </div>
    </div>
  );
}
