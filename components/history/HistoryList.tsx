import type { Expense, Category } from "@/types";
import { ExpenseGroup } from "@/components/expenses/ExpenseGroup";
import { format } from "date-fns";

interface HistoryListProps {
  expenses: Expense[];
  categories: Category[];
}

export function HistoryList({ expenses, categories }: HistoryListProps) {
  if (expenses.length === 0) {
    return (
      <div className="brutalist-box bg-surface p-8 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-sm text-foreground/60 font-mono">
          No expenses found. Try adjusting your filters.
        </p>
      </div>
    );
  }

  // Group by date
  const groups = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const key = format(new Date(expense.date), "yyyy-MM-dd");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(expense);
  }

  return (
    <div>
      {Array.from(groups.entries()).map(([key, dayExpenses]) => (
        <ExpenseGroup
          key={key}
          date={new Date(key)}
          expenses={dayExpenses}
          categories={categories}
        />
      ))}
    </div>
  );
}
