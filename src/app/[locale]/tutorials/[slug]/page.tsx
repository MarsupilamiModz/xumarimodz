import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { getTutorialBySlug } from "@/lib/tutorials/data";
import { TutorialDetail } from "@/components/tutorials/tutorial-detail";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params: { slug } }: { params: { slug: string } }): Promise<Metadata> {
  const tutorial = await getTutorialBySlug(slug).catch(() => null);
  if (!tutorial) return { title: "Tutorials" };
  return { title: tutorial.title, description: tutorial.description ?? undefined };
}

export default async function TutorialPage({ params: { locale, slug } }: { params: { locale: Locale; slug: string } }) {
  setRequestLocale(locale);
  const tutorial = await getTutorialBySlug(slug).catch(() => null);
  if (!tutorial) notFound();

  return (
    <div className="page-section pt-8 md:pt-10">
      <Link href={`/${locale}/tutorials`} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Tutorials
      </Link>
      <h1 className="h1-display mt-4 max-w-4xl">{tutorial.title}</h1>
      {tutorial.description && <p className="mt-3 max-w-3xl text-ink-muted">{tutorial.description}</p>}
      <div className="mt-8 max-w-4xl">
        <TutorialDetail locale={locale} tutorial={tutorial} />
      </div>
    </div>
  );
}
