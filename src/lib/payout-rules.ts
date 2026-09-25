import "server-only";
import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";

/** Regeln für Provisions-Auszahlungen (ACP → Provisionen). */
export type PayoutRules = {
  /** Mindestbetrag je Empfänger in Cent; kleinere Summen bleiben offen. */
  minPayoutCents: number;
  /** Tag im Monat (1–28), an dem ausgezahlt wird – Richtwert für den nächsten Lauf. */
  payoutDay: number;
  /** Rückbehalt in Tagen: Provisionen sind erst danach freigebbar (Schutz vor Erstattungen). */
  holdbackDays: number;
};

export const DEFAULT_PAYOUT_RULES: PayoutRules = { minPayoutCents: 2000, payoutDay: 15, holdbackDays: 14 };

export async function getPayoutRules(): Promise<PayoutRules> {
  return getSiteSetting<PayoutRules>("payout_rules", DEFAULT_PAYOUT_RULES);
}

export async function savePayoutRules(rules: PayoutRules) {
  await setSiteSetting("payout_rules", rules);
}

export function nextPayoutDate(rules: PayoutRules, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), rules.payoutDay);
  if (d <= from) d.setMonth(d.getMonth() + 1);
  return d;
}

export function holdbackCutoff(rules: PayoutRules, from = new Date()) {
  return new Date(from.getTime() - rules.holdbackDays * 86_400_000);
}
