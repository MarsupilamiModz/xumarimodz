"use client";

import { useTranslations } from "next-intl";
import { colors } from "@/styles/tokens";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionCard } from "@/components/ui/page-header";

export function RevenueChart({
  data,
  title,
}: {
  data: { date: string; revenue: number; conversions: number }[];
  title: string;
}) {
  const t = useTranslations("sharedUi.charts");
  return (
    <SectionCard title={title}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.line} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={colors.inkFaint} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} stroke={colors.inkFaint} />
            <Tooltip
              contentStyle={{ background: colors.bgRaised, border: `1px solid ${colors.line}`, borderRadius: 8, color: colors.ink }}
            />
            <Area type="monotone" dataKey="revenue" stroke={colors.violet} fill={colors.violet} fillOpacity={0.16} name={t("revenue")} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export function ConversionChart({
  data,
  title,
}: {
  data: { date: string; clicks: number; conversions: number }[];
  title: string;
}) {
  const t = useTranslations("sharedUi.charts");
  return (
    <SectionCard title={title}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.line} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={colors.inkFaint} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} stroke={colors.inkFaint} />
            <Tooltip
              contentStyle={{ background: colors.bgRaised, border: `1px solid ${colors.line}`, borderRadius: 8, color: colors.ink }}
            />
            <Bar dataKey="clicks" fill={colors.inkFaint} name={t("clicks")} radius={[4, 4, 0, 0]} />
            <Bar dataKey="conversions" fill={colors.violet} name={t("conversions")} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
