"use client";


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
import { Card } from "@/components/ui/card";

export function RevenueChart({
  data,
  title,
}: {
  data: { date: string; revenue: number; conversions: number }[];
  title: string;
}) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-4 text-muted-foreground">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.line} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={colors.inkFaint} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} stroke={colors.inkFaint} />
            <Tooltip
              contentStyle={{ background: colors.bgRaised, border: `1px solid ${colors.line}`, borderRadius: 8, color: colors.ink }}
            />
            <Area type="monotone" dataKey="revenue" stroke={colors.violet} fill={colors.violet} fillOpacity={0.16} name="Revenue (¢)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function ConversionChart({
  data,
  title,
}: {
  data: { date: string; clicks: number; conversions: number }[];
  title: string;
}) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-4 text-muted-foreground">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.line} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={colors.inkFaint} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} stroke={colors.inkFaint} />
            <Tooltip
              contentStyle={{ background: colors.bgRaised, border: `1px solid ${colors.line}`, borderRadius: 8, color: colors.ink }}
            />
            <Bar dataKey="clicks" fill={colors.inkFaint} name="Clicks" radius={[4, 4, 0, 0]} />
            <Bar dataKey="conversions" fill={colors.violet} name="Conversions" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
