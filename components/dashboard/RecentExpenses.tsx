import { getRecentExpenses } from "@/actions/expenses";
import { getUserCategories } from "@/actions/categories";
import { ExpenseCard } from "@/components/expenses/ExpenseCard";
import type { Category, Expense } from "@/types";

export async function RecentExpenses() {
  const [expenses, categories] = await Promise.all([
    getRecentExpenses(5),
    getUserCategories(),
  ]);

  if (expenses.length === 0) {
    return (
      <p className="text-sm text-foreground/40 font-mono text-center py-6">
        No expenses yet.
      </p>
    );
  }

  return (
    <div>
      {expenses.map((expense) => (
        <ExpenseCard
          key={expense.id}
          expense={expense as unknown as Expense}
          categories={categories as unknown as Category[]}
        />
      ))}
    </div>
  );
}
