import { getAnalyticsData, getTopExpenses } from "@/actions/analytics";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { MetricsRow } from "@/components/analytics/MetricsRow";
import { SpendingBarChart } from "@/components/analytics/SpendingBarChart";
import { SpendingLineChart } from "@/components/analytics/SpendingLineChart";
import { CategoryDonutChart } from "@/components/analytics/CategoryDonutChart";
import { CategoryBreakdownTable } from "@/components/analytics/CategoryBreakdownTable";
import { TopExpensesTable } from "@/components/analytics/TopExpensesTable";
import { getDateRangeFromParams } from "@/lib/utils";

interface AnalyticsPageProps {
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
  }>;
}

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const params = await searchParams;
  const { start, end } = getDateRangeFromParams({
    get: (key: string) => (params as Record<string, string>)[key] ?? null,
  });

  const [data, topExpenses] = await Promise.all([
    getAnalyticsData(start, end),
    getTopExpenses(start, end),
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="label-mono text-foreground/40 mb-1">INSIGHTS</div>
        <h1 className="text-3xl font-black text-foreground">Analytics</h1>
      </div>

      {/* Date Range Picker */}
      <div className="mb-4">
        <DateRangePicker />
      </div>

      {/* Metrics */}
      <MetricsRow data={data} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SpendingBarChart data={data.daily} />
        <SpendingLineChart data={data.daily} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <CategoryDonutChart data={data.byCategory} />
        <CategoryBreakdownTable data={data.byCategory} />
      </div>

      {/* Top 10 most expensive expenses */}
      <TopExpensesTable data={topExpenses} />
    </div>
  );
}
