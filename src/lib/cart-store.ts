/**
 * Warenkorb im Browser: nur Produkt-Slugs (Preise kommen immer frisch vom Server).
 * Änderungen werden per Event an Header und Warenkorbseite gemeldet.
 */
const KEY = "xm_cart";
export const CART_EVENT = "xm-cart-change";
export const CART_MAX = 10;

export function readCart(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string").slice(0, CART_MAX) : [];
  } catch {
    return [];
  }
}

function write(slugs: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(slugs.slice(0, CART_MAX)));
  } catch {
    /* Speicher nicht verfügbar (privater Modus) */
  }
  window.dispatchEvent(new Event(CART_EVENT));
}

export function addToCart(slug: string) {
  const cart = readCart();
  if (cart.includes(slug) || cart.length >= CART_MAX) return false;
  write([...cart, slug]);
  return true;
}

export function removeFromCart(slug: string) {
  write(readCart().filter((s) => s !== slug));
}

export function clearCart() {
  write([]);
}
