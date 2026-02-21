import { ExpenseCardSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="h-8 w-32 bg-border/20 animate-pulse mb-6" />
      <div className="brutalist-box bg-surface p-4 mb-4 h-20 animate-pulse" />
      <div className="brutalist-box bg-surface p-4">
        {[...Array(8)].map((_, i) => (
          <ExpenseCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
