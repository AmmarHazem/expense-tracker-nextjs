import type { Expense, Category } from "@/types";
import { ExpenseCard } from "./ExpenseCard";
import { format } from "date-fns";

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

interface ExpenseGroupProps {
  date: Date;
  expenses: Expense[];
  categories: Category[];
}

export function ExpenseGroup({ date, expenses, categories }: ExpenseGroupProps) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="brutalist-box bg-surface mb-4">
      {/* Day header */}
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-border bg-background">
        <div className="label-mono text-foreground/60">
          {format(new Date(date), "EEEE, MMMM d, yyyy")}
        </div>
        <div className="font-black text-sm font-mono text-foreground">
          {fmt.format(total)}
        </div>
      </div>

      {/* Expenses */}
      <div className="px-4">
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            categories={categories}
          />
        ))}
      </div>
    </div>
  );
}
