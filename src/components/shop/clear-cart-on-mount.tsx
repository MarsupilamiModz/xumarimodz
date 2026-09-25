"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/cart-store";

/** Leert den Warenkorb nach erfolgreicher Zahlung (Bestätigungsseite). */
export function ClearCartOnMount() {
  useEffect(() => clearCart(), []);
  return null;
}
