"use client";

import { Modal } from "@/components/ui/Modal";
import { ExpenseForm } from "./ExpenseForm";
import { createExpense, updateExpense } from "@/actions/expenses";
import type { Category, Expense } from "@/types";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  expense?: Expense;
}

export function ExpenseModal({
  isOpen,
  onClose,
  categories,
  expense,
}: ExpenseModalProps) {
  const handleSubmit = async (formData: FormData) => {
    if (expense) {
      return updateExpense(expense.id, formData);
    }
    return createExpense(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expense ? "Edit Expense" : "Add Expense"}
    >
      <ExpenseForm
        categories={categories}
        defaultValues={expense}
        onSubmit={handleSubmit}
        onSuccess={onClose}
      />
    </Modal>
  );
}
