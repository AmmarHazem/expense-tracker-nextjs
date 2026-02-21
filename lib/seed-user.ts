import { prisma } from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";

const DEFAULT_CATEGORIES = [
  { name: "Food", emoji: "🍔", color: "#FF6B6B" },
  { name: "Transport", emoji: "🚗", color: "#4ECDC4" },
  { name: "Housing", emoji: "🏠", color: "#45B7D1" },
  { name: "Entertainment", emoji: "🎮", color: "#F7DC6F" },
  { name: "Health", emoji: "💊", color: "#A8D5A2" },
  { name: "Shopping", emoji: "🛍️", color: "#C39BD3" },
  { name: "Travel", emoji: "✈️", color: "#F0A500" },
];

const MOCK_EXPENSES = [
  // Food
  { desc: "Carrefour Groceries", merchant: "Carrefour", cat: "Food", amount: 245.50, daysAgo: 1 },
  { desc: "McDonald's Lunch", merchant: "McDonald's", cat: "Food", amount: 42.00, daysAgo: 2 },
  { desc: "Waitrose Supermarket", merchant: "Waitrose", cat: "Food", amount: 189.75, daysAgo: 4 },
  { desc: "Subway Sandwich", merchant: "Subway", cat: "Food", amount: 28.00, daysAgo: 6 },
  { desc: "Al Safeer Groceries", merchant: "Al Safeer", cat: "Food", amount: 312.00, daysAgo: 9 },
  { desc: "Pizza Hut Dinner", merchant: "Pizza Hut", cat: "Food", amount: 95.00, daysAgo: 11 },
  { desc: "Lulu Hypermarket", merchant: "Lulu", cat: "Food", amount: 428.25, daysAgo: 14 },
  { desc: "KFC Meal", merchant: "KFC", cat: "Food", amount: 55.00, daysAgo: 16 },
  { desc: "Spinneys Weekly Shop", merchant: "Spinneys", cat: "Food", amount: 267.00, daysAgo: 18 },
  { desc: "Costa Coffee", merchant: "Costa", cat: "Food", amount: 32.00, daysAgo: 20 },
  { desc: "Carrefour Top-up", merchant: "Carrefour", cat: "Food", amount: 178.00, daysAgo: 23 },
  { desc: "Just Eat Order", merchant: "Just Eat", cat: "Food", amount: 72.50, daysAgo: 25 },
  // Transport
  { desc: "RTA Metro Card Top-up", merchant: "RTA", cat: "Transport", amount: 100.00, daysAgo: 3 },
  { desc: "Careem Ride", merchant: "Careem", cat: "Transport", amount: 38.50, daysAgo: 5 },
  { desc: "ADNOC Fuel", merchant: "ADNOC", cat: "Transport", amount: 220.00, daysAgo: 7 },
  { desc: "Uber Ride", merchant: "Uber", cat: "Transport", amount: 45.00, daysAgo: 10 },
  { desc: "ENOC Fuel", merchant: "ENOC", cat: "Transport", amount: 198.00, daysAgo: 21 },
  { desc: "Careem Ride to Airport", merchant: "Careem", cat: "Transport", amount: 89.00, daysAgo: 30 },
  // Housing
  { desc: "DEWA Electricity Bill", merchant: "DEWA", cat: "Housing", amount: 450.00, daysAgo: 15 },
  { desc: "Internet Bill - Du", merchant: "Du", cat: "Housing", amount: 349.00, daysAgo: 15 },
  { desc: "Etisalat Phone Bill", merchant: "Etisalat", cat: "Housing", amount: 199.00, daysAgo: 28 },
  // Entertainment
  { desc: "Netflix Subscription", merchant: "Netflix", cat: "Entertainment", amount: 65.00, daysAgo: 8 },
  { desc: "Dubai Cinema Tickets", merchant: "Reel Cinemas", cat: "Entertainment", amount: 120.00, daysAgo: 13 },
  { desc: "Spotify Premium", merchant: "Spotify", cat: "Entertainment", amount: 23.99, daysAgo: 22 },
  { desc: "Dubai Frame Tickets", merchant: "Dubai Frame", cat: "Entertainment", amount: 100.00, daysAgo: 35 },
  { desc: "Game Purchase - PS Store", merchant: "PlayStation", cat: "Entertainment", amount: 249.00, daysAgo: 40 },
  // Health
  { desc: "Pharmacy - Aster", merchant: "Aster Pharmacy", cat: "Health", amount: 87.50, daysAgo: 3 },
  { desc: "Gold's Gym Monthly", merchant: "Gold's Gym", cat: "Health", amount: 299.00, daysAgo: 17 },
  { desc: "Clinic Visit", merchant: "NMC Healthcare", cat: "Health", amount: 350.00, daysAgo: 33 },
  // Shopping
  { desc: "H&M Clothing", merchant: "H&M", cat: "Shopping", amount: 385.00, daysAgo: 12 },
  { desc: "Amazon UAE Order", merchant: "Amazon", cat: "Shopping", amount: 245.00, daysAgo: 19 },
  { desc: "Noon Flash Sale", merchant: "Noon", cat: "Shopping", amount: 567.00, daysAgo: 26 },
  { desc: "Zara Jeans", merchant: "Zara", cat: "Shopping", amount: 299.00, daysAgo: 45 },
  { desc: "IKEA Home Items", merchant: "IKEA", cat: "Shopping", amount: 1250.00, daysAgo: 55 },
  // Travel
  { desc: "Emirates Flight Upgrade", merchant: "Emirates", cat: "Travel", amount: 1800.00, daysAgo: 60 },
  { desc: "Marriott Hotel Stay", merchant: "Marriott", cat: "Travel", amount: 2400.00, daysAgo: 62 },
  { desc: "Booking.com Hotel", merchant: "Booking.com", cat: "Travel", amount: 890.00, daysAgo: 75 },
  { desc: "Flydubai Tickets", merchant: "Flydubai", cat: "Travel", amount: 1200.00, daysAgo: 80 },
  { desc: "Airport Transfer", merchant: "Careem", cat: "Travel", amount: 145.00, daysAgo: 82 },
  { desc: "Travel Insurance", merchant: "AXA Insurance", cat: "Travel", amount: 320.00, daysAgo: 85 },
];

export async function seedUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { seedLoaded: true },
  });

  if (!user || user.seedLoaded) return;

  // Create default categories
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      isDefault: true,
      userId,
    })),
    skipDuplicates: true,
  });

  // Fetch created categories
  const categories = await prisma.category.findMany({
    where: { userId },
  });

  const catMap = new Map(categories.map((c) => [c.name, c.id]));

  // Create mock expenses
  await prisma.expense.createMany({
    data: MOCK_EXPENSES.map((e) => ({
      amount: e.amount,
      description: e.desc,
      merchant: e.merchant,
      date: startOfDay(subDays(new Date(), e.daysAgo)),
      userId,
      categoryId: catMap.get(e.cat)!,
    })),
    skipDuplicates: true,
  });

  // Mark seed as loaded
  await prisma.user.update({
    where: { id: userId },
    data: { seedLoaded: true },
  });
}
