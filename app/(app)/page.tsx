import { Suspense } from "react";
import { getDashboardStats } from "@/actions/expenses";
import { getUserCategories } from "@/actions/categories";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentExpenses } from "@/components/dashboard/RecentExpenses";
import { QuickAddButton } from "@/components/dashboard/QuickAddButton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatCardSkeleton, ExpenseCardSkeleton } from "@/components/ui/Skeleton";
import type { Category } from "@/types";

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

async function DashboardStats() {
  const stats = await getDashboardStats();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <StatCard
        label="This Month"
        value={fmt.format(stats.thisMonth)}
        icon="💰"
        trend={stats.trend}
      />
      <StatCard
        label="Last Month"
        value={fmt.format(stats.lastMonth)}
        icon="📅"
      />
      <StatCard
        label="Total Expenses"
        value={stats.totalExpenses.toString()}
        icon="🧾"
      />
      <StatCard
        label="Avg Per Expense"
        value={fmt.format(stats.avgPerExpense)}
        icon="📊"
      />
    </div>
  );
}

async function RecentExpensesSection({
  categories,
}: {
  categories: Category[];
}) {
  return (
    <div className="brutalist-box bg-surface">
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-border">
        <div className="label-mono text-foreground/60">RECENT EXPENSES</div>
      </div>
      <div className="px-4">
        <Suspense
          fallback={
            <div className="py-2">
              {[...Array(5)].map((_, i) => (
                <ExpenseCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <RecentExpenses />
        </Suspense>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [categories, stats] = await Promise.all([
    getUserCategories(),
    getDashboardStats(),
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="label-mono text-foreground/40 mb-1">OVERVIEW</div>
        <h1 className="text-3xl font-black text-foreground">Dashboard</h1>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[...Array(4)].map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <DashboardStats />
      </Suspense>

      {stats.totalExpenses === 0 ? (
        <EmptyState />
      ) : (
        <RecentExpensesSection categories={categories as unknown as Category[]} />
      )}

      <QuickAddButton categories={categories as unknown as Category[]} />
    </div>
  );
}
