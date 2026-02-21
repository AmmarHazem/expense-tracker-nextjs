"use client";

import { useState, useEffect } from "react";
import { getUserCategories } from "@/actions/categories";
import { ManageCategoriesModal } from "@/components/categories/ManageCategoriesModal";
import { CategoryBadge } from "@/components/categories/CategoryBadge";
import { Button } from "@/components/ui/Button";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    getUserCategories().then((cats) => setCategories(cats as unknown as Category[]));
  }, [modalOpen]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="label-mono text-foreground/40 mb-1">SETTINGS</div>
          <h1 className="text-3xl font-black text-foreground">Categories</h1>
        </div>
        <Button onClick={() => setModalOpen(true)}>Manage</Button>
      </div>

      <div className="brutalist-box bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-border bg-background">
          <div className="label-mono text-foreground/60">ALL CATEGORIES</div>
        </div>
        <div className="divide-y-2 divide-border">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
              <div
                className="w-10 h-10 flex items-center justify-center text-xl border-2 border-border"
                style={{ backgroundColor: cat.color + "22" }}
              >
                {cat.emoji}
              </div>
              <div className="flex-1">
                <div className="font-bold text-foreground">{cat.name}</div>
                <div className="label-mono text-foreground/40">
                  {cat.isDefault ? "DEFAULT" : "CUSTOM"}
                </div>
              </div>
              <CategoryBadge
                emoji={cat.emoji}
                name={cat.name}
                color={cat.color}
              />
            </div>
          ))}
        </div>
      </div>

      <ManageCategoriesModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
      />
    </div>
  );
}
