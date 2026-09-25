import { colors } from "@/styles/tokens";
import { SITE } from "@/lib/site";

/**
 * Platzhalter in E-Mail-Vorlagen. Beide Schreibweisen funktionieren: `{username}` und `%username%`.
 * Die deutschen Namen aus dem ACP (%produkt%, %rechnung% …) sind Aliase der internen Schlüssel.
 */
export const PLACEHOLDER_ALIASES: Record<string, string> = {
  produkt: "product",
  rechnung: "invoice",
  premium_bis: "premium_until",
  ticket: "ticket_id",
};

/** Platzhalter, die im Editor als Chips angeboten werden (Anzeige mit %…%). */
export const EDITOR_PLACEHOLDERS = [
  "username",
  "produkt",
  "rechnung",
  "premium_bis",
  "reset_link",
  "ticket",
  "website_name",
  "message",
  "verify_link",
] as const;

/** Beispielwerte für die Vorschau – deutlich als Beispiel erkennbar, keine echten Daten. */
export const SAMPLE_VALUES: Record<string, string> = {
  username: "beispiel_nutzer",
  creator_name: "Beispiel-Creator",
  product: "Premium (12 Monate)",
  order_title: "Beispiel-Auftrag",
  order_id: "ORD-0000",
  invoice: "RE-2026-00001",
  premium_until: "31.12.2026",
  reset_link: "https://example.com/reset",
  verify_link: "https://example.com/verify",
  ticket_id: "XM-BEISPIEL",
  subject: "Beispiel-Betreff",
  message: "Dies ist ein Beispieltext für die Vorschau.",
  discord: "beispiel#0000",
  email: "nutzer@example.com",
};

export function renderTemplate(template: { subject: string; html: string }, vars: Record<string, string>) {
  const merged: Record<string, string> = { website_name: vars.website_name ?? SITE.name, ...vars };
  const lookup = (name: string) => merged[name] ?? merged[PLACEHOLDER_ALIASES[name] ?? ""];
  const replace = (text: string) =>
    text.replace(/\{([a-z_]+)\}|%([a-z_]+)%/g, (token, a: string | undefined, b: string | undefined) => {
      const value = lookup((a ?? b)!);
      return value === undefined ? token : value;
    });
  return { subject: replace(template.subject), html: wrapEmailHtml(replace(template.html)) };
}

/** Helles E-Mail-Layout mit Tabellen-freiem Inline-CSS (breit unterstützt). */
export function wrapEmailHtml(body: string) {
  return `
    <div style="background:${colors.emailBg};padding:24px 12px;font-family:Inter,Segoe UI,Arial,sans-serif">
      <div style="max-width:560px;margin:0 auto;padding:28px;background:${colors.emailSurface};color:${colors.emailInk};border-radius:12px;border:1px solid ${colors.emailLine};font-size:15px;line-height:1.55">
        <div style="margin-bottom:20px;font-weight:700;font-size:16px;color:${colors.emailInk}">${SITE.name}</div>
        ${body}
        <p style="margin-top:28px;padding-top:16px;border-top:1px solid ${colors.emailLine};font-size:12px;color:${colors.emailMuted}">© ${SITE.name}</p>
      </div>
    </div>
  `;
}
