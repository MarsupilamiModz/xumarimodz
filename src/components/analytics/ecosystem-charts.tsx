"use client";

import dynamic from "next/dynamic";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Skeleton } from "@/components/ui/skeleton";

function ChartSkeleton() {
  // Endmaß wie die geladene Karte (Titelzeile + 224px Diagramm), damit nichts springt.
  return <Skeleton className="h-[302px] rounded-lg" />;
}

export const RevenueChart = dynamic(
  () => import("./ecosystem-charts-recharts").then((m) => ({ default: m.RevenueChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const ConversionChart = dynamic(
  () => import("./ecosystem-charts-recharts").then((m) => ({ default: m.ConversionChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export function StatGrid({ stats }: { stats: { label: string; value: string; hint?: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <KpiTile key={s.label} label={s.label} value={s.value} hint={s.hint} />
      ))}
    </div>
  );
}
