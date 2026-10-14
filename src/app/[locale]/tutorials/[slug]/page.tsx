import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { getTutorialBySlug } from "@/lib/tutorials/data";
import { TutorialDetail } from "@/components/tutorials/tutorial-detail";
import { PageHeader } from "@/components/ui/page-header";
import type { Locale } from "@/i18n/config";

// ISR: jede Anleitung beim ersten Aufruf rendern und 5 Minuten cachen.
export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;

  const {
    slug
  } = params;

  const tutorial = await getTutorialBySlug(slug).catch(() => null);
  if (!tutorial) return { title: "Tutorials" };
  return { title: tutorial.title, description: tutorial.description ?? undefined };
}

export default async function TutorialPage(props: { params: Promise<{ locale: Locale; slug: string }> }) {
  const params = await props.params;

  const {
    locale,
    slug
  } = params;

  setRequestLocale(locale);
  const tutorial = await getTutorialBySlug(slug).catch(() => null);
  if (!tutorial) notFound();
  const t = await getTranslations("common.tutorialsPage");

  return (
    <div className="page-section pt-8 md:pt-10">
      <Link href={`/${locale}/tutorials`} className="meta mb-6 inline-flex items-center gap-1.5 hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        {t("title")}
      </Link>
      <div className="max-w-4xl">
        <PageHeader title={tutorial.title} description={tutorial.description ?? undefined} />
        <TutorialDetail locale={locale} tutorial={tutorial} />
      </div>
    </div>
  );
}
