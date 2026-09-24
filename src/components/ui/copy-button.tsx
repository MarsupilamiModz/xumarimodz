"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Kopiert `value` in die Zwischenablage und bestätigt das kurz im Button-Text. */
export function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Zwischenablage nicht verfügbar – Wert bleibt markierbar */
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void copy()} aria-live="polite">
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copied ? copiedLabel : label}
    </Button>
  );
}
