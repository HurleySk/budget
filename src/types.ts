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

export interface AdHocTransaction {
  id: string;
  periodNumber: number;  // Which period this applies to (1-based)
  name: string;
  amount: number;        // Always positive
  isIncome: boolean;     // true = income, false = expense
}

export interface PeriodStartSnapshot {
  periodStartDate: string;   // ISO date of when this period started
  balance: number;           // What currentBalance was at period start
}

export interface PeriodSpendEntry {
  periodEndDate: string;     // When this period ended
  startingBalance: number;   // Balance at start of period
  expectedEnding: number;    // Calculated: start + income - expenses
  actualEnding: number;      // What user reported as new starting balance
  trueSpend: number;         // expectedEnding - actualEnding (discretionary spend)
}

export type VarianceReason =
  | 'adhoc_expense'           // One-time unexpected expense
  | 'planned_cost_higher'     // Pre-planned expense cost more than expected
  | 'baseline_miss';          // True baseline spending miss

export interface VarianceExplanation {
  reason: VarianceReason;
  amount: number;
  description?: string;        // Optional note (e.g., "car repair")
  affectsBaseline: boolean;    // Only 'baseline_miss' = true
}

export interface HistoricalPeriod {
  id: string;
  periodNumber: number;        // Original period number (0 = first tracked)
  startDate: string;           // ISO date
  endDate: string;             // ISO date
  startingBalance: number;
  endingBalance: number;       // Actual ending balance
  projectedEndingBalance: number;
  income: number;
  recurringExpenses: number;
  adHocIncome: number;
  adHocExpenses: number;
  baselineSpend: number;
  variance: number;            // projectedEnding - actualEnding
  varianceExplanations: VarianceExplanation[];
  status: 'completed' | 'pending-confirmation' | 'active';
  confirmedAt?: string;        // ISO datetime when user confirmed
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
  adHocTransactions: AdHocTransaction[];
  baselineSpendPerPeriod: number;
  savingsGoal: number;
  // Starting balance tracking
  currentBalanceAsOf?: string;      // ISO date - when user last updated currentBalance
  periodStartSnapshot?: PeriodStartSnapshot;  // Snapshot at period start for true spend calc
  periodSpendHistory: PeriodSpendEntry[];     // History of true spend per period
  periodsForBaselineCalc: number;    // Default: 8
  useCalculatedBaseline: boolean;    // Toggle: use calculated vs manual
  transitionHistoryRetentionDays: number;  // Default: 7

  // Immutable budget tracking start
  budgetStartDate?: string;           // ISO date - when tracking began (immutable once set)

  // Historical period records
  periods: HistoricalPeriod[];        // All historical periods

  // Period confirmation settings
  periodConfirmationGraceDays: number; // Default: 3
}

export interface ProjectionEntry {
  date: Date;
  periodNumber: number;
  income: number;
  expenses: number;
  expenseDetails: ExpenseOccurrence[];  // Breakdown of recurring expenses
  adHocIncome: number;                  // Total ad-hoc income for this period
  adHocExpenses: number;                // Total ad-hoc expenses for this period
  adHocDetails: AdHocTransaction[];     // Ad-hoc transactions for this period
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
  adHocTransactions: [],
  baselineSpendPerPeriod: 0,
  savingsGoal: 0,
  currentBalanceAsOf: undefined,
  periodStartSnapshot: undefined,
  periodSpendHistory: [],
  periodsForBaselineCalc: 8,
  useCalculatedBaseline: false,
  transitionHistoryRetentionDays: 7,
  budgetStartDate: undefined,
  periods: [],
  periodConfirmationGraceDays: 3,
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
