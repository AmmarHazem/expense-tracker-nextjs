"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/schemas/category.schema";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getUserCategories() {
  const userId = await requireAuth();

  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return categories;
}

export async function createCategory(formData: FormData) {
  const userId = await requireAuth();

  const raw = {
    name: formData.get("name") as string,
    emoji: formData.get("emoji") as string,
    color: formData.get("color") as string,
  };

  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { name, emoji, color } = parsed.data;

  try {
    await prisma.category.create({
      data: { name, emoji, color, isDefault: false, userId },
    });
  } catch {
    return { error: { name: ["Category name already exists"] } };
  }

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/analytics");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const userId = await requireAuth();

  const cat = await prisma.category.findFirst({ where: { id, userId } });
  if (!cat) return { error: "Not found" };
  if (cat.isDefault) return { error: "Cannot delete default categories" };

  // Move expenses to first default category
  const defaultCat = await prisma.category.findFirst({
    where: { userId, isDefault: true },
  });

  if (defaultCat) {
    await prisma.expense.updateMany({
      where: { categoryId: id, userId },
      data: { categoryId: defaultCat.id },
    });
  }

  await prisma.category.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/analytics");
  return { success: true };
}
