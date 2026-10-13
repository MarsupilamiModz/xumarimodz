import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { getTutorialBySlug } from "@/lib/tutorials/data";
import { TutorialDetail } from "@/components/tutorials/tutorial-detail";
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
      <Link href={`/${locale}/tutorials`} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {t("title")}
      </Link>
      <h1 className="h1-display mt-4 max-w-4xl">{tutorial.title}</h1>
      {tutorial.description && <p className="mt-3 max-w-3xl text-ink-muted">{tutorial.description}</p>}
      <div className="mt-8 max-w-4xl">
        <TutorialDetail locale={locale} tutorial={tutorial} />
      </div>
    </div>
  );
}
