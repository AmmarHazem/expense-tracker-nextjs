"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailySpending } from "@/types";
import { format } from "date-fns";

interface SpendingBarChartProps {
  data: DailySpending[];
}

export function SpendingBarChart({ data }: SpendingBarChartProps) {
  // Aggregate by week if data spans > 35 days
  const displayData =
    data.length > 35
      ? data.filter((_, i) => i % 7 === 0)
      : data;

  return (
    <div className="brutalist-box bg-surface p-4">
      <div className="label-mono text-foreground/50 mb-4">DAILY SPENDING</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={displayData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" opacity={0.3} />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => format(new Date(d), "MMM d")}
            tick={{ fontSize: 10, fontFamily: "monospace", fill: "var(--fg)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fontFamily: "monospace", fill: "var(--fg)" }}
            tickFormatter={(v) => `${v}`}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "2px solid var(--border)",
              borderRadius: 0,
              fontSize: 12,
              fontFamily: "monospace",
            }}
            formatter={(val: number | undefined) => [
              new Intl.NumberFormat("en-AE", {
                style: "currency",
                currency: "AED",
              }).format(val ?? 0),
              "Spent",
            ]}
            labelFormatter={(label) => format(new Date(label), "EEEE, MMM d")}
          />
          <Bar dataKey="amount" fill="#0066FF" maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
