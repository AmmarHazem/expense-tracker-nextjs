"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import type { Category } from "@/types";

interface HistoryFiltersProps {
  categories: Category[];
}

export function HistoryFilters({ categories }: HistoryFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selectedCats, setSelectedCats] = useState<string[]>(
    searchParams.getAll("cat")
  );

  const updateParams = useCallback(
    (newSearch: string, newCats: string[]) => {
      const params = new URLSearchParams();
      if (newSearch) params.set("search", newSearch);
      newCats.forEach((c) => params.append("cat", c));
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router]
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams(search, selectedCats);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCat = (id: string) => {
    const next = selectedCats.includes(id)
      ? selectedCats.filter((c) => c !== id)
      : [...selectedCats, id];
    setSelectedCats(next);
    updateParams(search, next);
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCats([]);
    router.push(pathname);
  };

  const hasFilters = search || selectedCats.length > 0;

  return (
    <div className="brutalist-box bg-surface p-4 mb-4">
      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search merchant or description..."
          className="w-full bg-background border-2 border-border text-foreground px-3 py-2 text-sm font-mono
            focus:outline-none focus:ring-2 focus:ring-blue-primary focus:border-blue-primary
            placeholder:text-foreground/30"
          aria-label="Search expenses"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const active = selectedCats.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggleCat(cat.id)}
              className={`brutalist-btn text-xs py-1 px-2 font-bold transition-all`}
              style={
                active
                  ? {
                      backgroundColor: cat.color + "33",
                      borderColor: cat.color,
                      color: cat.color,
                    }
                  : {}
              }
              aria-pressed={active}
            >
              {cat.emoji} {cat.name}
            </button>
          );
        })}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="brutalist-btn text-xs py-1 px-2 font-bold bg-surface text-foreground/50"
          >
            Clear ✕
          </button>
        )}
      </div>
    </div>
  );
}
