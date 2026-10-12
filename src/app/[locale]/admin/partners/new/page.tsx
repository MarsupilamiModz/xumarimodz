import { requirePagePermission } from "@/lib/auth";
import { setRequestLocale } from "next-intl/server";
import NewPartnerForm from "./new-partner-form";
import type { Locale } from "@/i18n/config";

export default async function NewPartnerPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  await requirePagePermission("users.write");
  setRequestLocale(locale);
  return (
    <div className="space-y-4">
      <h1 className="h1-acp">Create Partner</h1>
      <NewPartnerForm locale={locale} />
    </div>
  );
}
