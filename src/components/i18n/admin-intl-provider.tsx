import { getMessages } from "next-intl/server";
import { IntlProvider } from "@/components/i18n/intl-provider";

/**
 * Das Locale-Layout schickt die ACP-Texte nicht an den Browser. Bereiche mit ACP-Komponenten
 * (Client-Komponenten mit admin.*-Namespace) bekommen hier den vollständigen Satz.
 */
export async function AdminIntlProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  const messages = await getMessages().catch(() => ({}));
  return (
    <IntlProvider locale={locale} messages={messages}>
      {children}
    </IntlProvider>
  );
}
