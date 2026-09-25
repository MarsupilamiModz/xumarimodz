"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, ok, requireActionUser } from "@/lib/action-utils";
import { rateLimit } from "@/lib/rate-limit";
import { generateInvoiceNumber } from "@/lib/invoices";
import { createCartCheckout, getStripe } from "@/lib/stripe";
import { getPaymentSettings } from "@/lib/payments/settings";

const MAX_ITEMS = 10;
const slugsSchema = z.array(z.string().min(1).max(160)).max(MAX_ITEMS);

/** Aktuelle Preise und Verfügbarkeit für den Warenkorb – immer vom Server, nie aus dem Browser. */
export async function getCartQuote(slugs: string[]) {
  const parsed = slugsSchema.safeParse(Array.from(new Set(slugs)));
  if (!parsed.success) return fail("Invalid cart");
  const products = parsed.data.length
    ? await prisma.shopProduct.findMany({
        where: { slug: { in: parsed.data } },
        select: { slug: true, name: true, priceCents: true, pricingMode: true, status: true, thumbnailUrl: true, stock: true },
      })
    : [];
  const items = parsed.data.map((slug) => {
    const p = products.find((x) => x.slug === slug);
    const available = !!p && p.status === "ACTIVE" && p.pricingMode !== "QUOTE" && p.priceCents > 0 && (p.stock == null || p.stock > 0);
    return { slug, name: p?.name ?? slug, priceCents: p?.priceCents ?? 0, thumbnailUrl: p?.thumbnailUrl ?? null, available };
  });
  return ok({ items, totalCents: items.filter((i) => i.available).reduce((s, i) => s + i.priceCents, 0) });
}

const checkoutSchema = z.object({
  slugs: slugsSchema.min(1),
  acceptTerms: z.literal(true),
  waiveWithdrawal: z.literal(true),
  discord: z.string().max(64).optional(),
  locale: z.string().max(5).default("de"),
  origin: z.string().max(200).optional(),
});

/**
 * Kasse: legt je Produkt eine Bestellung mit fortlaufender Rechnungsnummer an und startet eine Stripe-Session.
 * AGB und Widerrufsverzicht werden serverseitig verlangt und mit Zeitstempel an der Bestellung vermerkt.
 */
export async function startCartCheckout(input: z.input<typeof checkoutSchema>) {
  const { user, error } = await requireActionUser();
  if (error) return error;
  if (!rateLimit(`cart-checkout:${user.id}`, 10, 3600_000).success) return fail("Too many attempts. Please try again later.");
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return fail("Please accept the terms and the withdrawal notice");

  const settings = await getPaymentSettings();
  if (!settings.stripeEnabled) return fail("Online payment is currently unavailable");

  const products = await prisma.shopProduct.findMany({
    where: { slug: { in: Array.from(new Set(parsed.data.slugs)) }, status: "ACTIVE" },
    select: { id: true, slug: true, name: true, shortDescription: true, priceCents: true, pricingMode: true, productType: true, stock: true, customType: { select: { name: true } } },
  });
  const buyable = products.filter((p) => p.pricingMode !== "QUOTE" && p.priceCents > 0 && (p.stock == null || p.stock > 0));
  if (buyable.length !== new Set(parsed.data.slugs).size) return fail("Some products are no longer available – please check your cart");

  const now = new Date().toISOString();
  const legalNote = `AGB akzeptiert: ${now} · Verzicht auf Widerrufsrecht bei sofortiger Ausführung: ${now}`;
  const orders: { id: string; name: string; amountCents: number; invoiceNumber: string }[] = [];
  for (const p of buyable) {
    const invoiceNumber = await generateInvoiceNumber();
    const order = await prisma.customOrder.create({
      data: {
        clientId: user.id,
        shopProductId: p.id,
        title: p.name,
        description: p.shortDescription ?? p.name,
        orderType: p.customType?.name ?? p.productType,
        budgetCents: p.priceCents,
        finalAmountCents: p.priceCents,
        invoiceNumber,
        customerEmail: user.email,
        discordUsername: parsed.data.discord?.trim() || user.discordUsername || undefined,
        status: "PENDING",
        paymentStatus: "AWAITING_PAYMENT",
        paymentNote: legalNote,
      },
      select: { id: true },
    });
    orders.push({ id: order.id, name: p.name, amountCents: p.priceCents, invoiceNumber });
  }

  try {
    const session = await createCartCheckout(user.id, user.email, orders, parsed.data.locale, { clientOrigin: parsed.data.origin });
    revalidatePath("/dashboard/orders");
    return ok({ checkoutUrl: session.url ?? null });
  } catch (err) {
    // Session konnte nicht erstellt werden: Bestellungen als nicht bezahlt belassen, Kunde kann erneut zahlen.
    return fail(err instanceof Error ? err.message : "Checkout failed");
  }
}

/** Bestätigungsseite: Bestellungen der Session – nur für den Käufer selbst. */
export async function getCheckoutResult(sessionId: string) {
  const { user, error } = await requireActionUser();
  if (error) return error;
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return fail("Invalid session");
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.metadata?.userId !== user.id) return fail("Not found");
  const ids = (session.metadata?.orderIds ?? session.metadata?.orderId ?? "").split(",").filter(Boolean);
  const orders = await prisma.customOrder.findMany({
    where: { id: { in: ids }, clientId: user.id },
    select: { id: true, title: true, invoiceNumber: true, finalAmountCents: true, paymentStatus: true },
  });
  return ok({ paid: session.payment_status === "paid", totalCents: session.amount_total ?? 0, orders });
}
