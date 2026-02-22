import type { TopExpense } from "@/types";

const amountFmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("en-AE", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

interface TopExpensesTableProps {
  data: TopExpense[];
}

export function TopExpensesTable({ data }: TopExpensesTableProps) {
  if (data.length === 0) {
    return (
      <div className="brutalist-box bg-surface p-4">
        <div className="label-mono text-foreground/50 mb-4">TOP 10 EXPENSES</div>
        <p className="text-sm text-foreground/40 font-mono">No expenses for this period.</p>
      </div>
    );
  }

  return (
    <div className="brutalist-box bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-border bg-background">
        <div className="label-mono text-foreground/60">TOP 10 EXPENSES</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="px-4 py-2 text-left label-mono text-foreground/40 w-8">#</th>
              <th className="px-4 py-2 text-left label-mono text-foreground/40">Description</th>
              <th className="px-4 py-2 text-left label-mono text-foreground/40 hidden sm:table-cell">Category</th>
              <th className="px-4 py-2 text-right label-mono text-foreground/40 hidden sm:table-cell">Date</th>
              <th className="px-4 py-2 text-right label-mono text-foreground/40">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.map((expense, index) => {
              const label = expense.merchant || expense.description;
              return (
                <tr key={expense.id} className="border-b border-border/40 hover:bg-background">
                  <td className="px-4 py-2.5 text-foreground/30 font-bold text-xs tabular-nums">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2.5">
                    {label ? (
                      <span className="font-bold text-foreground">{label}</span>
                    ) : (
                      <span className="text-foreground/30 italic">No label</span>
                    )}
                    {/* Category + date shown inline on mobile */}
                    <div className="sm:hidden flex items-center gap-1.5 mt-0.5">
                      <div
                        className="w-2 h-2 shrink-0"
                        style={{ backgroundColor: expense.category.color }}
                      />
                      <span className="text-foreground/50 text-xs">
                        {expense.category.emoji} {expense.category.name}
                      </span>
                      <span className="text-foreground/30 text-xs">
                        · {dateFmt.format(new Date(expense.date))}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 shrink-0"
                        style={{ backgroundColor: expense.category.color }}
                      />
                      <span className="text-foreground/70">
                        {expense.category.emoji} {expense.category.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-foreground/50 hidden sm:table-cell whitespace-nowrap">
                    {dateFmt.format(new Date(expense.date))}
                  </td>
                  <td className="px-4 py-2.5 text-right font-black whitespace-nowrap">
                    {amountFmt.format(expense.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
