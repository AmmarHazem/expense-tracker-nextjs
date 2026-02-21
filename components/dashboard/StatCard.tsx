interface StatCardProps {
  label: string;
  value: string;
  icon?: string;
  trend?: number;
  subLabel?: string;
}

export function StatCard({ label, value, icon, trend, subLabel }: StatCardProps) {
  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;

  return (
    <div className="brutalist-box bg-surface p-4">
      <div className="label-mono text-foreground/50 mb-2">{label}</div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-2xl font-black text-foreground font-mono leading-none">
            {value}
          </div>
          {subLabel && (
            <div className="text-xs text-foreground/50 font-mono mt-1">{subLabel}</div>
          )}
        </div>
        {icon && (
          <div className="text-2xl leading-none shrink-0">{icon}</div>
        )}
      </div>
      {trend !== undefined && (
        <div
          className={`label-mono mt-3 ${
            trendPositive
              ? "text-red-500"
              : trendNegative
              ? "text-green-500"
              : "text-foreground/40"
          }`}
        >
          {trendPositive ? "▲" : trendNegative ? "▼" : "—"}{" "}
          {Math.abs(trend).toFixed(1)}% vs last month
        </div>
      )}
    </div>
  );
}
