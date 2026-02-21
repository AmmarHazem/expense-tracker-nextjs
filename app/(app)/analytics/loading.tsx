import { StatCardSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="h-8 w-32 bg-border/20 animate-pulse mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="brutalist-box bg-surface h-64 animate-pulse" />
        <div className="brutalist-box bg-surface h-64 animate-pulse" />
      </div>
    </div>
  );
}
