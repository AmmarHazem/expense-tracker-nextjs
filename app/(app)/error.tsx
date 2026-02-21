"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="brutalist-box bg-surface p-8 text-center max-w-sm">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-lg font-black text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-foreground/60 font-mono mb-4">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="brutalist-btn bg-blue-primary text-white text-sm px-4 py-2 font-bold uppercase tracking-wider"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
