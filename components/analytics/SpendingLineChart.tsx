"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailySpending } from "@/types";
import { format } from "date-fns";

interface SpendingLineChartProps {
  data: DailySpending[];
}

export function SpendingLineChart({ data }: SpendingLineChartProps) {
  return (
    <div className="brutalist-box bg-surface p-4">
      <div className="label-mono text-foreground/50 mb-4">CUMULATIVE SPENDING</div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
            width={50}
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
              "Total",
            ]}
            labelFormatter={(label) => format(new Date(label), "EEEE, MMM d")}
          />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="#0066FF"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#0066FF" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
