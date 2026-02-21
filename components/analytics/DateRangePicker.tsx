"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const PRESETS = [
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "3 Months", value: "3mo" },
  { label: "6 Months", value: "6mo" },
] as const;

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activePreset = searchParams.get("range") ?? "month";

  const handleSelect = (preset: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", preset);
    params.delete("start");
    params.delete("end");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => handleSelect(p.value)}
          className={`brutalist-btn text-xs py-1.5 px-3 font-bold uppercase tracking-wider transition-all
            ${
              activePreset === p.value
                ? "bg-blue-primary text-white border-blue-primary"
                : "bg-surface text-foreground"
            }`}
          aria-pressed={activePreset === p.value}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
