"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/schemas/expense.schema";
import { Decimal } from "@prisma/client/runtime/client";

function requireAuth() {
  return auth().then((session) => {
    if (!session?.user?.id) throw new Error("Unauthorized");
    return session.user.id;
  });
}

export async function createExpense(formData: FormData) {
  const userId = await requireAuth();

  const raw = {
    amount: formData.get("amount") as string,
    categoryId: formData.get("categoryId") as string,
    date: formData.get("date") as string,
    description: formData.get("description") as string | undefined,
    merchant: formData.get("merchant") as string | undefined,
  };

  const parsed = expenseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { amount, categoryId, date, description, merchant } = parsed.data;

  await prisma.expense.create({
    data: {
      amount: parseFloat(amount),
      categoryId,
      date: new Date(date),
      description: description || null,
      merchant: merchant || null,
      userId,
    },
  });

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/analytics");
  return { success: true };
}

export async function updateExpense(id: string, formData: FormData) {
  const userId = await requireAuth();

  const raw = {
    amount: formData.get("amount") as string,
    categoryId: formData.get("categoryId") as string,
    date: formData.get("date") as string,
    description: formData.get("description") as string | undefined,
    merchant: formData.get("merchant") as string | undefined,
  };

  const parsed = expenseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { amount, categoryId, date, description, merchant } = parsed.data;

  // Ensure ownership
  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) return { error: "Not found" };

  await prisma.expense.update({
    where: { id },
    data: {
      amount: parseFloat(amount),
      categoryId,
      date: new Date(date),
      description: description || null,
      merchant: merchant || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/analytics");
  return { success: true };
}

export async function deleteExpense(id: string) {
  const userId = await requireAuth();

  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) return { error: "Not found" };

  await prisma.expense.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/analytics");
  return { success: true };
}

export async function getExpenses({
  page = 1,
  pageSize = 20,
  categoryIds,
  search,
  startDate,
  endDate,
}: {
  page?: number;
  pageSize?: number;
  categoryIds?: string[];
  search?: string;
  startDate?: Date;
  endDate?: Date;
} = {}) {
  const userId = await requireAuth();

  const where = {
    userId,
    ...(categoryIds?.length ? { categoryId: { in: categoryIds } } : {}),
    ...(search
      ? {
          OR: [
            { description: { contains: search, mode: "insensitive" as const } },
            { merchant: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(startDate || endDate
      ? {
          date: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
  };

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    expenses: expenses.map((e: { amount: Decimal }) => ({
      ...e,
      amount: parseFloat(e.amount.toString()),
    })),
    total,
    hasMore: page * pageSize < total,
  };
}

export async function getRecentExpenses(limit = 5) {
  const userId = await requireAuth();

  const expenses = await prisma.expense.findMany({
    where: { userId },
    include: { category: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return expenses.map((e) => ({
    ...e,
    amount: parseFloat(e.amount.toString()),
  }));
}

export async function getDashboardStats() {
  const userId = await requireAuth();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [thisMonth, lastMonth, total, count] = await Promise.all([
    prisma.expense.aggregate({
      where: { userId, date: { gte: startOfMonth } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { userId, date: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { userId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.count({ where: { userId } }),
  ]);

  const thisMonthTotal = parseFloat((thisMonth._sum.amount ?? 0).toString());
  const lastMonthTotal = parseFloat((lastMonth._sum.amount ?? 0).toString());
  const trend =
    lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

  return {
    thisMonth: thisMonthTotal,
    lastMonth: lastMonthTotal,
    trend,
    totalExpenses: count,
    totalAmount: parseFloat((total._sum.amount ?? 0).toString()),
    avgPerExpense:
      total._count > 0
        ? parseFloat((total._sum.amount ?? 0).toString()) / total._count
        : 0,
  };
}
