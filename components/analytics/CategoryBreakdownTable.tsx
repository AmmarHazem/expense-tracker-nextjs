import type { CategorySpending } from "@/types";

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

interface CategoryBreakdownTableProps {
  data: CategorySpending[];
}

export function CategoryBreakdownTable({ data }: CategoryBreakdownTableProps) {
  if (data.length === 0) {
    return (
      <div className="brutalist-box bg-surface p-4">
        <div className="label-mono text-foreground/50 mb-4">CATEGORY BREAKDOWN</div>
        <p className="text-sm text-foreground/40 font-mono">No data for this period.</p>
      </div>
    );
  }

  return (
    <div className="brutalist-box bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-border bg-background">
        <div className="label-mono text-foreground/60">CATEGORY BREAKDOWN</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="px-4 py-2 text-left label-mono text-foreground/40">Category</th>
              <th className="px-4 py-2 text-right label-mono text-foreground/40">Amount</th>
              <th className="px-4 py-2 text-right label-mono text-foreground/40">Count</th>
              <th className="px-4 py-2 text-right label-mono text-foreground/40">%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((cat) => (
              <tr key={cat.categoryId} className="border-b border-border/40 hover:bg-background">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 border border-border shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>
                      {cat.emoji} {cat.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-black">
                  {fmt.format(cat.amount)}
                </td>
                <td className="px-4 py-2.5 text-right text-foreground/60">
                  {cat.count}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-border/20 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.min(100, cat.percentage)}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                    <span className="text-foreground/70 w-10 text-right">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
