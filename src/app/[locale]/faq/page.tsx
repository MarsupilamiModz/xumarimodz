import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { FaqList } from "@/components/faq/faq-list";
import { getFaqEntries } from "@/lib/faq";
import type { Locale } from "@/i18n/config";

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

  const t = await getTranslations({ locale, namespace: "landing" });
  return { title: t("faqTitle") };
}

export default async function FaqPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const [t, tp] = await Promise.all([getTranslations("landing"), getTranslations("publicPages.faq")]);
  const entries = await getFaqEntries(locale);

  return (
    <section className="page-section">
      <div className="max-w-3xl">
        <PageHeader title={t("faqTitle")} />
        {entries.length > 0 ? (
          <FaqList entries={entries} />
        ) : (
          <EmptyState icon={HelpCircle} title={tp("emptyTitle")} description={tp("emptyText")} />
        )}
      </div>
    </section>
  );
}
