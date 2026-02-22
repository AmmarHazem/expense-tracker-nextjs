"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format, eachDayOfInterval } from "date-fns";
import type { AnalyticsData, TopExpense } from "@/types";
import { Decimal } from "@prisma/client/runtime/client";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getAnalyticsData(
  startDate: Date,
  endDate: Date,
): Promise<AnalyticsData> {
  const userId = await requireAuth();

  const rangeMs = endDate.getTime() - startDate.getTime();
  const prevStart = new Date(startDate.getTime() - rangeMs);
  const prevEnd = new Date(startDate);

  const [expenses, prevExpenses] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      include: { category: true },
      orderBy: { date: "asc" },
    }),
    prisma.expense.aggregate({
      where: { userId, date: { gte: prevStart, lte: prevEnd } },
      _sum: { amount: true },
    }),
  ]);

  const totalSpent = expenses.reduce(
    (sum: number, e: { amount: Decimal }) =>
      sum + parseFloat(e.amount.toString()),
    0,
  );

  // Daily spending with cumulative
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  let cumulative = 0;
  const dailyMap = new Map<string, number>();
  for (const e of expenses) {
    const key = format(e.date, "yyyy-MM-dd");
    dailyMap.set(
      key,
      (dailyMap.get(key) || 0) + parseFloat(e.amount.toString()),
    );
  }

  const daily = days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    const amount = dailyMap.get(key) || 0;
    cumulative += amount;
    return { date: key, amount, cumulative };
  });

  // By category
  const catMap = new Map<
    string,
    {
      name: string;
      emoji: string;
      color: string;
      amount: number;
      count: number;
    }
  >();
  for (const e of expenses) {
    const key = e.categoryId;
    const existing = catMap.get(key);
    const amt = parseFloat(e.amount.toString());
    if (existing) {
      existing.amount += amt;
      existing.count += 1;
    } else {
      catMap.set(key, {
        name: e.category.name,
        emoji: e.category.emoji,
        color: e.category.color,
        amount: amt,
        count: 1,
      });
    }
  }

  const byCategory = Array.from(catMap.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      ...data,
      percentage: totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const daysCount = days.length || 1;
  const avgDaily = totalSpent / daysCount;
  const topCategory = byCategory[0] ?? null;
  const previousPeriodTotal = parseFloat(
    (prevExpenses._sum.amount ?? 0).toString(),
  );

  return {
    daily,
    byCategory,
    totalSpent,
    avgDaily,
    topCategory,
    previousPeriodTotal,
  };
}

export async function getTopExpenses(
  startDate: Date,
  endDate: Date,
): Promise<TopExpense[]> {
  const userId = await requireAuth();

  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    include: { category: true },
    orderBy: { amount: "desc" },
    take: 10,
  });

  return expenses.map((e) => ({
    id: e.id,
    amount: parseFloat(e.amount.toString()),
    description: e.description,
    merchant: e.merchant,
    date: format(e.date, "yyyy-MM-dd"),
    category: {
      name: e.category.name,
      emoji: e.category.emoji,
      color: e.category.color,
    },
  }));
}
