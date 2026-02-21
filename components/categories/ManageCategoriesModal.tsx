"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, CategoryFormData } from "@/schemas/category.schema";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { createCategory, deleteCategory } from "@/actions/categories";
import type { Category } from "@/types";

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

const COLOR_PRESETS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#F7DC6F",
  "#A8D5A2", "#C39BD3", "#F0A500", "#0066FF",
  "#FF9F43", "#EE5A24", "#12CBC4", "#A3CB38",
];

export function ManageCategoriesModal({
  isOpen,
  onClose,
  categories,
}: ManageCategoriesModalProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", emoji: "", color: "#0066FF" },
  });

  const selectedColor = watch("color");

  const onSubmit = handleSubmit(async (data) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, v));
    const result = await createCategory(fd);
    if (result?.success) reset();
  });

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await deleteCategory(id);
    setDeleting(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories">
      {/* Add new */}
      <form onSubmit={onSubmit} className="space-y-3 mb-6">
        <div className="label-mono text-foreground/50 mb-2">ADD CATEGORY</div>
        <div className="flex gap-2">
          <Input
            id="emoji"
            placeholder="🏷️"
            className="w-16 text-center text-lg"
            {...register("emoji")}
          />
          <Input
            id="name"
            placeholder="Category name"
            error={errors.name?.message}
            {...register("name")}
          />
        </div>
        {errors.emoji && (
          <p className="text-xs text-red-500 font-mono">{errors.emoji.message}</p>
        )}

        {/* Color picker */}
        <div>
          <div className="label-mono text-foreground/50 mb-1.5">COLOR</div>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue("color", c)}
                className={`w-8 h-8 border-2 transition-all ${
                  selectedColor === c ? "border-foreground scale-110" : "border-border"
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
            <Input
              id="color"
              type="color"
              className="w-10 h-8 p-0.5 cursor-pointer"
              {...register("color")}
            />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting ? <Spinner className="w-3 h-3" /> : "Add Category"}
        </Button>
      </form>

      {/* Existing categories */}
      <div>
        <div className="label-mono text-foreground/50 mb-2">YOUR CATEGORIES</div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 py-2 border-b border-border/40"
            >
              <div
                className="w-6 h-6 border-2 border-border flex items-center justify-center text-sm shrink-0"
                style={{ backgroundColor: cat.color + "33" }}
              >
                {cat.emoji}
              </div>
              <span className="flex-1 text-sm font-mono text-foreground">
                {cat.name}
              </span>
              {cat.isDefault ? (
                <span className="label-mono text-foreground/30">DEFAULT</span>
              ) : (
                <button
                  onClick={() => handleDelete(cat.id)}
                  disabled={deleting === cat.id}
                  className="text-red-500 hover:text-red-600 text-xs font-bold disabled:opacity-50"
                  aria-label={`Delete ${cat.name}`}
                >
                  {deleting === cat.id ? <Spinner className="w-3 h-3" /> : "✕"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
