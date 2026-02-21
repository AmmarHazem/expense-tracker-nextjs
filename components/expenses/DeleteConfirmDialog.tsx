"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { deleteExpense } from "@/actions/expenses";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  expenseId: string;
  description?: string | null;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  expenseId,
  description,
}: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    await deleteExpense(expenseId);
    setLoading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Expense">
      <div className="space-y-4">
        <p className="text-sm text-foreground font-mono">
          Are you sure you want to delete{" "}
          <strong>{description || "this expense"}</strong>? This cannot be
          undone.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1"
          >
            {loading ? <Spinner className="w-4 h-4" /> : "Delete"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
