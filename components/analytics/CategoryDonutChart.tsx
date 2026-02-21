"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { CategorySpending } from "@/types";

interface CategoryDonutChartProps {
  data: CategorySpending[];
}

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 0,
});

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  if (data.length === 0) {
    return (
      <div className="brutalist-box bg-surface p-4">
        <div className="label-mono text-foreground/50 mb-4">BY CATEGORY</div>
        <div className="h-48 flex items-center justify-center text-foreground/30 font-mono text-sm">
          No data
        </div>
      </div>
    );
  }

  return (
    <div className="brutalist-box bg-surface p-4">
      <div className="label-mono text-foreground/50 mb-4">BY CATEGORY</div>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={90}
            dataKey="amount"
            nameKey="name"
            strokeWidth={2}
            stroke="var(--border)"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "2px solid var(--border)",
              borderRadius: 0,
              fontSize: 12,
              fontFamily: "monospace",
            }}
            formatter={(val: number | undefined, name: string | undefined) => [fmt.format(val ?? 0), name ?? ""]}
          />
          <Legend
            iconType="square"
            iconSize={10}
            formatter={(value) => (
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--fg)" }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
