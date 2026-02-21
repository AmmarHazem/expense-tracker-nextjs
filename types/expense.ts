export interface Expense {
  id: string;
  amount: number;
  description: string | null;
  merchant: string | null;
  date: Date;
  userId: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    emoji: string;
    color: string;
  };
}

export interface ExpenseGroup {
  date: Date;
  expenses: Expense[];
  total: number;
}
