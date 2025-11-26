export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type ExpenseFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type WeekendHandling = 'before' | 'after' | 'none';

export interface SemiMonthlyConfig {
  firstPayDay: number;   // 1-31, day of month for first payment
  secondPayDay: number;  // 1-31 (use 31 for "last day of month")
}

export interface MonthlyConfig {
  payDay: number;  // 1-31, where 29-31 are treated as "that day or last day, whichever is earlier"
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  frequency: ExpenseFrequency;
  nextDueDate: string;  // ISO date (YYYY-MM-DD) - anchor for recurring pattern
}

export interface ExpenseOccurrence {
  expenseId: string;
  name: string;
  amount: number;
  date: Date;
}

export interface BudgetConfig {
  currentBalance: number;
  paycheckAmount: number;
  paycheckFrequency: PayFrequency;
  nextPayDate: string;              // ISO date string (YYYY-MM-DD)
  weekendHandling: WeekendHandling; // How to handle paydays on weekends
  semiMonthlyConfig: SemiMonthlyConfig;  // Pay days for semi-monthly
  monthlyConfig: MonthlyConfig;     // Pay day for monthly
  recurringExpenses: RecurringExpense[];
  baselineSpendPerPeriod: number;
  savingsGoal: number;
}

export interface ProjectionEntry {
  date: Date;
  periodNumber: number;
  income: number;
  expenses: number;
  expenseDetails: ExpenseOccurrence[];  // Breakdown of expenses hitting this period
  baselineSpend: number;
  balanceAfterIncome: number;
  balanceAfterExpenses: number;
  balanceAfterBaseline: number;
}

export interface GoalProjection {
  dateBeforeExpenses: Date | null;
  dateAfterExpenses: Date | null;
  dateAfterBaseline: Date | null;
  periodsToGoal: number;
  daysToGoal: number;
}

export const DEFAULT_CONFIG: BudgetConfig = {
  currentBalance: 0,
  paycheckAmount: 0,
  paycheckFrequency: 'biweekly',
  nextPayDate: new Date().toISOString().split('T')[0],  // Today as default
  weekendHandling: 'before',  // Pay on Friday if payday falls on weekend
  semiMonthlyConfig: {
    firstPayDay: 1,
    secondPayDay: 15,
  },
  monthlyConfig: {
    payDay: 1,
  },
  recurringExpenses: [],
  baselineSpendPerPeriod: 0,
  savingsGoal: 0,
};

export const WEEKEND_HANDLING_LABELS: Record<WeekendHandling, string> = {
  before: 'Pay on Friday before',
  after: 'Pay on Monday after',
  none: 'No adjustment',
};

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  semimonthly: 'Semi-monthly',
  monthly: 'Monthly',
};

export const EXPENSE_FREQUENCY_LABELS: Record<ExpenseFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};
