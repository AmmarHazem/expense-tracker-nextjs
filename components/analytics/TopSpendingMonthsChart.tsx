"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { MonthlySpending } from "@/types";
import { format } from "date-fns";

const amountFmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface TopSpendingMonthsChartProps {
  data: MonthlySpending[];
}

export function TopSpendingMonthsChart({ data }: TopSpendingMonthsChartProps) {
  if (data.length === 0) {
    return (
      <div className="brutalist-box bg-surface p-4">
        <div className="label-mono text-foreground/50 mb-4">TOP SPENDING MONTHS</div>
        <p className="text-sm text-foreground/40 font-mono">No data yet.</p>
      </div>
    );
  }

  const maxAmount = data[0].amount;

  return (
    <div className="brutalist-box bg-surface p-4">
      <div className="label-mono text-foreground/50 mb-4">TOP SPENDING MONTHS</div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="2 2"
            stroke="var(--border)"
            opacity={0.3}
          />
          <XAxis
            dataKey="month"
            tickFormatter={(m) => format(new Date(`${m}-01`), "MMM yy")}
            tick={{ fontSize: 10, fontFamily: "monospace", fill: "var(--fg)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            tick={{ fontSize: 10, fontFamily: "monospace", fill: "var(--fg)" }}
            tickFormatter={(v) => amountFmt.format(v)}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "2px solid var(--border)",
              borderRadius: 0,
              fontSize: 12,
              fontFamily: "monospace",
            }}
            formatter={(val: number) => [amountFmt.format(val), "Total spent"]}
            labelFormatter={(m) => format(new Date(`${m}-01`), "MMMM yyyy")}
          />
          <Bar dataKey="amount" maxBarSize={48}>
            {data.map((entry) => (
              <Cell
                key={entry.month}
                fill={
                  entry.amount === maxAmount
                    ? "#0066FF"
                    : `rgba(0, 102, 255, ${0.3 + 0.5 * (entry.amount / maxAmount)})`
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
