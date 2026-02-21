import { StatCard } from "@/components/dashboard/StatCard";
import type { AnalyticsData } from "@/types";

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface MetricsRowProps {
  data: AnalyticsData;
}

export function MetricsRow({ data }: MetricsRowProps) {
  const trend =
    data.previousPeriodTotal > 0
      ? ((data.totalSpent - data.previousPeriodTotal) / data.previousPeriodTotal) * 100
      : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <StatCard
        label="Total Spent"
        value={fmt.format(data.totalSpent)}
        icon="💰"
        trend={trend}
      />
      <StatCard
        label="Daily Average"
        value={fmt.format(data.avgDaily)}
        icon="📅"
      />
      <StatCard
        label="Top Category"
        value={data.topCategory ? `${data.topCategory.emoji} ${data.topCategory.name}` : "—"}
        icon=""
        subLabel={data.topCategory ? fmt.format(data.topCategory.amount) : undefined}
      />
      <StatCard
        label="vs Previous Period"
        value={
          data.previousPeriodTotal > 0
            ? `${trend > 0 ? "+" : ""}${trend.toFixed(1)}%`
            : "N/A"
        }
        icon={trend > 0 ? "📈" : "📉"}
      />
    </div>
  );
}
