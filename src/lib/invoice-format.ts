// Browser-taugliche Formatierung (ohne Datenbank).
export function formatPaymentReference(invoiceNumber: string): string {
  return `Invoice ${invoiceNumber}`;
}
