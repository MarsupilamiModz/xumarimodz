// Ohne Serverzugriff – auch in Client-Komponenten importierbar.
export function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(1);
}
