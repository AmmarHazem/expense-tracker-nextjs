export interface DailySpending {
  date: string;
  amount: number;
  cumulative: number;
}

export interface CategorySpending {
  categoryId: string;
  name: string;
  emoji: string;
  color: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface AnalyticsData {
  daily: DailySpending[];
  byCategory: CategorySpending[];
  totalSpent: number;
  avgDaily: number;
  topCategory: CategorySpending | null;
  previousPeriodTotal: number;
}

export interface TopExpense {
  id: string;
  amount: number;
  description: string | null;
  merchant: string | null;
  date: string;
  category: {
    name: string;
    emoji: string;
    color: string;
  };
}
