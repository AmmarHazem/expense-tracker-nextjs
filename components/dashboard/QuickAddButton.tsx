"use client";

import { useState } from "react";
import { ExpenseModal } from "@/components/expenses/ExpenseModal";
import type { Category } from "@/types";

export function QuickAddButton({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="brutalist-btn fixed bottom-6 right-6 w-14 h-14 bg-blue-primary text-white font-black text-2xl flex items-center justify-center transition-all z-20"
        aria-label="Add expense"
      >
        +
      </button>
      <ExpenseModal
        isOpen={open}
        onClose={() => setOpen(false)}
        categories={categories}
      />
    </>
  );
}
