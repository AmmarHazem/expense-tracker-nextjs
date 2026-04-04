"use client";

import { endOfMonth, format, isValid, startOfMonth, subMonths } from "date-fns";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const today = new Date().toISOString().split("T")[0];

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlStart = searchParams.get("start") ?? "";
  const urlEnd = searchParams.get("end") ?? "";
  const hasCustom = !!(urlStart && urlEnd);
  const activePreset = hasCustom ? null : (searchParams.get("range") ?? "month");

  const [showCustom, setShowCustom] = useState(hasCustom);
  const [startVal, setStartVal] = useState(urlStart);
  const [endVal, setEndVal] = useState(urlEnd);

  const PRESETS = useMemo(() => {
    const pastMonth = startOfMonth(subMonths(new Date(), 1));
    const month2Before = startOfMonth(subMonths(new Date(), 2));
    const month3Before = startOfMonth(subMonths(new Date(), 3));
    return [
      { label: "This Week", value: "week" },
      { label: "This Month", value: "month" },
      { label: format(pastMonth, "MMMM yyyy"), value: `${pastMonth.toISOString()}_${endOfMonth(pastMonth).toISOString()}` },
      {
        label: format(month2Before, "MMMM yyyy"),
        value: `${month2Before.toISOString()}_${endOfMonth(month2Before).toISOString()}`,
      },
      {
        label: format(month3Before, "MMMM yyyy"),
        value: `${month3Before.toISOString()}_${endOfMonth(month3Before).toISOString()}`,
      },
    ];
  }, []);

  // Sync local state when URL changes (back/forward navigation)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowCustom(hasCustom);
    setStartVal(urlStart);
    setEndVal(urlEnd);
  }, [urlStart, urlEnd, hasCustom]);

  const handlePreset = (preset: string) => {
    const splitPreset = preset.split("_");
    if (splitPreset.length === 2) {
      const [startDateStr, endDateStr] = splitPreset;
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      console.log({ startDate, endDate, startDateStr, endDateStr });
      if (isValid(startDate) && isValid(endDate)) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("start", format(startDate, "yyyy-MM-dd"));
        params.set("end", format(endDate, "yyyy-MM-dd"));
        params.set("range", preset);
        router.push(`${pathname}?${params.toString()}`);
        return;
      }
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", preset);
    params.delete("start");
    params.delete("end");
    setShowCustom(false);
    router.push(`${pathname}?${params.toString()}`);
  };

  const applyCustomRange = (start: string, end: string) => {
    if (!start || !end) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("start", start);
    params.set("end", end);
    params.delete("range");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePreset(p.value)}
            className={`brutalist-btn text-xs py-1.5 px-3 font-bold uppercase tracking-wider transition-all
              ${activePreset === p.value ? "bg-blue-primary text-white border-blue-primary" : "bg-surface text-foreground"}`}
            aria-pressed={activePreset === p.value}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(true)}
          className={`brutalist-btn text-xs py-1.5 px-3 font-bold uppercase tracking-wider transition-all
            ${showCustom ? "bg-blue-primary text-white border-blue-primary" : "bg-surface text-foreground"}`}
          aria-pressed={showCustom}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="label-mono text-foreground/50">From</span>
            <input
              type="date"
              value={startVal}
              max={endVal || today}
              onChange={(e) => {
                setStartVal(e.target.value);
                if (e.target.value && endVal) {
                  applyCustomRange(e.target.value, endVal);
                }
              }}
              className="brutalist-btn bg-surface text-foreground text-xs px-2 py-1.5 font-mono [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="label-mono text-foreground/50">To</span>
            <input
              type="date"
              value={endVal}
              min={startVal || undefined}
              max={today}
              onChange={(e) => {
                setEndVal(e.target.value);
                if (startVal && e.target.value) {
                  applyCustomRange(startVal, e.target.value);
                }
              }}
              className="brutalist-btn bg-surface text-foreground text-xs px-2 py-1.5 font-mono [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
