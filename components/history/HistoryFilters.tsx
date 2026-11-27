"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Category } from "@/types";

interface HistoryFiltersProps {
  categories: Category[];
}

export function HistoryFilters({ categories }: HistoryFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryString = searchParams.toString();
  const search = searchParams.get("search") ?? "";
  const selectedCats = searchParams.getAll("cat");
  const searchInput = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore the field on Back/Forward without treating navigation as an edit.
  // Cleanup also cancels a pending search when another navigation takes over.
  useEffect(() => {
    if (searchInput.current) searchInput.current.value = search;
    return () => {
      if (searchTimer.current !== null) clearTimeout(searchTimer.current);
    };
  }, [queryString, search]);

  function cancelSearch() {
    if (searchTimer.current !== null) clearTimeout(searchTimer.current);
    searchTimer.current = null;
  }

  function updateParams(newSearch: string, newCats: string[]) {
    cancelSearch();
    const params = new URLSearchParams(queryString);
    params.delete("search");
    params.delete("cat");
    if (newSearch) params.set("search", newSearch);
    newCats.forEach((c) => params.append("cat", c));
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearch(value: string) {
    cancelSearch();
    // Only user edits schedule navigation. Mounting on page 12 does nothing.
    if (value === search) return;
    searchTimer.current = setTimeout(() => updateParams(value, selectedCats), 300);
  }

  function toggleCat(id: string) {
    const next = selectedCats.includes(id)
      ? selectedCats.filter((c) => c !== id)
      : [...selectedCats, id];
    updateParams(searchInput.current?.value ?? search, next);
  }

  function clearFilters() {
    cancelSearch();
    if (searchInput.current) searchInput.current.value = "";
    router.push(pathname);
  }

  const hasFilters = search || selectedCats.length > 0;

  return (
    <div className="brutalist-box bg-surface p-4 mb-4">
      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          ref={searchInput}
          defaultValue={search}
          onChange={(e) => handleSearch(e.target.value)}
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
