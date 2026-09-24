import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FaqList } from "@/components/faq/faq-list";
import { getFaqEntries } from "@/lib/faq";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "landing" });
  return { title: t("faqTitle") };
}

export default async function FaqPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const entries = await getFaqEntries(locale);

  return (
    <section className="page-section">
      <div className="max-w-3xl">
        <h1 className="h1-display">{t("faqTitle")}</h1>
        <div className="mt-10">
          {entries.length > 0 ? <FaqList entries={entries} /> : <EmptyState icon={HelpCircle} title={t("faqTitle")} />}
        </div>
      </div>
    </section>
  );
}
