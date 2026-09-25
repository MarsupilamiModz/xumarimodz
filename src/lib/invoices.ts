import { prisma } from "@/lib/db";

/**
 * Fortlaufende Rechnungsnummer, z. B. MM-2026-10042 (Postgres-Sequenz „invoice_number_seq“,
 * lückenlos aufsteigend und ohne Kollisionen auch bei parallelen Bestellungen).
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`SELECT nextval('invoice_number_seq') AS n`;
  return `MM-${year}-${String(rows[0]!.n).padStart(5, "0")}`;
}

export { formatPaymentReference } from "@/lib/invoice-format";
