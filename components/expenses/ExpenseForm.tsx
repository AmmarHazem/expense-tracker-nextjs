"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, ExpenseFormData } from "@/schemas/expense.schema";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { Category, Expense } from "@/types";
import { format } from "date-fns";

interface ExpenseFormProps {
  categories: Category[];
  defaultValues?: Partial<Expense>;
  onSubmit: (data: FormData) => Promise<{ success?: boolean; error?: unknown }>;
  onSuccess: () => void;
}

export function ExpenseForm({
  categories,
  defaultValues,
  onSubmit,
  onSuccess,
}: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: defaultValues?.amount?.toString() ?? "",
      categoryId: defaultValues?.categoryId ?? "",
      date: defaultValues?.date
        ? format(new Date(defaultValues.date), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      description: defaultValues?.description ?? "",
      merchant: defaultValues?.merchant ?? "",
    },
  });

  const submit = handleSubmit(async (data) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== "") fd.append(k, v as string);
    });

    const result = await onSubmit(fd);
    if (result?.success) {
      onSuccess();
    } else if (result?.error && typeof result.error === "object") {
      const errs = result.error as Record<string, string[]>;
      for (const [field, messages] of Object.entries(errs)) {
        setError(field as keyof ExpenseFormData, {
          message: messages[0],
        });
      }
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Amount */}
      <Input
        label="Amount (AED)"
        id="amount"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="0.00"
        error={errors.amount?.message}
        {...register("amount")}
      />

      {/* Category */}
      <div>
        <label htmlFor="categoryId" className="label-mono text-foreground/60 block mb-1">
          Category
        </label>
        <select
          id="categoryId"
          className={`w-full bg-surface border-2 border-border text-foreground px-3 py-2.5 text-sm font-mono
            focus:outline-none focus:ring-2 focus:ring-blue-primary focus:border-blue-primary
            ${errors.categoryId ? "border-red-500" : ""}`}
          {...register("categoryId")}
        >
          <option value="">Select category...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.emoji} {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="mt-1 text-xs text-red-500 font-mono">
            {errors.categoryId.message}
          </p>
        )}
      </div>

      {/* Date */}
      <Input
        label="Date"
        id="date"
        type="date"
        error={errors.date?.message}
        {...register("date")}
      />

      {/* Merchant */}
      <Input
        label="Merchant (optional)"
        id="merchant"
        type="text"
        placeholder="e.g. Carrefour"
        error={errors.merchant?.message}
        {...register("merchant")}
      />

      {/* Description */}
      <Input
        label="Description (optional)"
        id="description"
        type="text"
        placeholder="e.g. Weekly groceries"
        error={errors.description?.message}
        {...register("description")}
      />

      <div className="pt-2">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Spinner className="w-4 h-4" />
              Saving...
            </>
          ) : defaultValues?.id ? (
            "Update Expense"
          ) : (
            "Add Expense"
          )}
        </Button>
      </div>
    </form>
  );
}
