export function EmptyState() {
  return (
    <div className="brutalist-box bg-surface p-8 text-center">
      <div className="text-6xl mb-4">💸</div>
      <h3 className="text-xl font-black text-foreground mb-2">
        No expenses yet
      </h3>
      <p className="text-sm text-foreground/60 font-mono mb-4">
        Start tracking your spending by adding your first expense.
      </p>
      <div className="label-mono text-foreground/40">
        Click the + button to get started
      </div>
    </div>
  );
}
