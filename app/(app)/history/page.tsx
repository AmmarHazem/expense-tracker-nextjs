import { Suspense } from "react";
import { getExpenses } from "@/actions/expenses";
import { getUserCategories } from "@/actions/categories";
import { HistoryFilters } from "@/components/history/HistoryFilters";
import { HistoryList } from "@/components/history/HistoryList";
import { ShowMoreButton } from "@/components/expenses/ShowMoreButton";
import { QuickAddButton } from "@/components/dashboard/QuickAddButton";
import { ExpenseCardSkeleton } from "@/components/ui/Skeleton";
import type { Expense, Category } from "@/types";

interface HistoryPageProps {
  searchParams: Promise<{
    page?: string;
    cat?: string | string[];
    search?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const catParam = params.cat;
  const categoryIds = catParam
    ? Array.isArray(catParam)
      ? catParam
      : [catParam]
    : [];
  const search = params.search;

  const [categories, { expenses, hasMore }] = await Promise.all([
    getUserCategories(),
    getExpenses({
      page,
      pageSize: PAGE_SIZE,
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
      search: search || undefined,
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="label-mono text-foreground/40 mb-1">TIMELINE</div>
        <h1 className="text-3xl font-black text-foreground">History</h1>
      </div>

      <HistoryFilters categories={categories as unknown as Category[]} />

      <Suspense
        fallback={
          <div className="brutalist-box bg-surface p-4">
            {[...Array(5)].map((_, i) => (
              <ExpenseCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <HistoryList
          expenses={expenses as unknown as Expense[]}
          categories={categories as unknown as Category[]}
        />
      </Suspense>

      <ShowMoreButton currentPage={page} hasMore={hasMore} />

      <QuickAddButton categories={categories as unknown as Category[]} />
    </div>
  );
}
