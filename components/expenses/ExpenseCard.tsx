"use client";

import { useState } from "react";
import type { Expense, Category } from "@/types";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { ExpenseModal } from "./ExpenseModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { format } from "date-fns";

const fmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
});

interface ExpenseCardProps {
  expense: Expense;
  categories: Category[];
}

export function ExpenseCard({ expense, categories }: ExpenseCardProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 py-3 border-b-2 border-border last:border-b-0 group">
        {/* Emoji */}
        <div
          className="w-10 h-10 flex items-center justify-center text-xl border-2 border-border shrink-0"
          style={{ backgroundColor: expense.category.color + "22" }}
        >
          {expense.category.emoji}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground truncate">
            {expense.merchant || expense.description || "Expense"}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <CategoryBadge
              emoji={expense.category.emoji}
              name={expense.category.name}
              color={expense.category.color}
            />
            {expense.merchant && expense.description && (
              <span className="text-xs text-foreground/50 font-mono truncate">
                {expense.description}
              </span>
            )}
          </div>
        </div>

        {/* Amount + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-black text-foreground font-mono">
            {fmt.format(expense.amount)}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="brutalist-btn w-7 h-7 flex items-center justify-center bg-surface text-foreground text-xs"
              aria-label="Edit expense"
            >
              ✏️
            </button>
            <button
              onClick={() => setDeleting(true)}
              className="brutalist-btn w-7 h-7 flex items-center justify-center bg-surface text-red-500 text-xs"
              aria-label="Delete expense"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      <ExpenseModal
        isOpen={editing}
        onClose={() => setEditing(false)}
        categories={categories}
        expense={expense}
      />
      <DeleteConfirmDialog
        isOpen={deleting}
        onClose={() => setDeleting(false)}
        expenseId={expense.id}
        description={expense.merchant || expense.description}
      />
    </>
  );
}
