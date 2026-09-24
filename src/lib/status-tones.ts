import type { StatusTone } from "@/components/ui/status-badge";

/**
 * Farbton je Status (immer zusammen mit dem Wort anzeigen, nie nur Farbe).
 * Beschriftungen: Übersetzungen unter common → status.<art>.<WERT>.
 */
export function ticketTone(status: string): StatusTone {
  if (status === "ESCALATED") return "danger";
  if (status === "RESOLVED" || status === "CLOSED") return "success";
  if (status === "WAITING_FOR_USER") return "pending";
  return "warning";
}

export function modTone(status: string): StatusTone {
  if (status === "PUBLISHED") return "success";
  if (status === "PENDING") return "warning";
  if (status === "REJECTED") return "danger";
  return "neutral";
}

export function applicationTone(status: string): StatusTone {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "PENDING") return "warning";
  return "pending";
}

export function reportTone(status: string): StatusTone {
  if (status === "RESOLVED") return "success";
  if (status === "REJECTED") return "neutral";
  if (status === "SUBMITTED") return "warning";
  return "pending";
}
