export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type ExpenseFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type WeekendHandling = 'before' | 'after' | 'none';
export type SweepTrigger = 'afterIncome' | 'afterExpenses' | 'afterBaseline';

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
  periodNumber: number;       // Which period this applies to (0-based, relative)
  periodStartDate?: string;   // ISO date - anchors transaction to specific period (immutable)
  name: string;
  amount: number;             // Always positive
  isIncome: boolean;          // true = income, false = expense
}

export interface PeriodStartSnapshot {
  periodStartDate: string;        // ISO date of when this period started
  balanceBeforePaycheck: number;  // Balance BEFORE any paycheck for this period
  paycheckReceived: boolean;      // Whether a paycheck was received at period start
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
  savingsSwept?: number;
  cumulativeSavings?: number;
}

// Static Periods Model Types
// These are NEW types for the static periods implementation.
// HistoricalPeriod above is kept for backward compatibility during migration.

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: string;                    // ISO date (YYYY-MM-DD)
  type: 'recurring' | 'adhoc';
  isIncome: boolean;
  recurringExpenseId?: string;     // Links to RecurringExpense.id if type is 'recurring'
}

export interface Period {
  id: string;                      // e.g., "period-2026-01-01"
  startDate: string;               // ISO date - when period begins
  endDate: string;                 // ISO date - when period ends
  status: 'active' | 'completed';

  // Balance tracking
  calculatedStartingBalance: number;  // Previous period's computed ending
  actualStartingBalance?: number;     // User override
  income: number;                     // Paycheck + adhoc income

  // Embedded transactions
  transactions: Transaction[];

  // Spending
  baselineSpend: number;

  // Sweep data (optional)
  savingsSwept?: number;
  cumulativeSavings?: number;
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

  // @deprecated - Transactions are now embedded in Period.transactions
  // Kept for backward compatibility with future period projections
  adHocTransactions: AdHocTransaction[];

  // @deprecated - No longer used after static periods migration
  // Balance is now tracked in Period.actualStartingBalance
  currentBalanceAsOf?: string;

  // @deprecated - No longer used after static periods migration
  // Active period is now stored directly in periods array
  periodStartSnapshot?: PeriodStartSnapshot;

  // @deprecated - Variance is now tracked in Period records
  periodSpendHistory: PeriodSpendEntry[];

  periodsForBaselineCalc: number;    // Default: 8
  useCalculatedBaseline: boolean;    // Toggle: use calculated vs manual
  transitionHistoryRetentionDays: number;  // Default: 7

  // Immutable budget tracking start
  budgetStartDate?: string;           // ISO date - when tracking began (immutable once set)

  // Period records - may contain HistoricalPeriod (legacy) or Period (static model) objects
  // After migration, this array contains Period objects with status 'active' or 'completed'
  periods: (HistoricalPeriod | Period)[];

  // Period confirmation settings
  periodConfirmationGraceDays: number; // Default: 3

  // UI preferences
  balanceView?: 'afterIncome' | 'afterExpenses' | 'afterBaseline';

  // Savings sweep settings
  autoSweepEnabled?: boolean;
  sweepTrigger?: SweepTrigger;
}

/**
 * Type guard to check if a period is a static Period (new model).
 * Static periods have 'transactions' array and no 'periodNumber'.
 */
export function isStaticPeriod(period: HistoricalPeriod | Period): period is Period {
  return 'transactions' in period && Array.isArray((period as Period).transactions);
}

/**
 * Type guard to check if a period is a HistoricalPeriod (legacy model).
 */
export function isHistoricalPeriod(period: HistoricalPeriod | Period): period is HistoricalPeriod {
  return 'periodNumber' in period && typeof (period as HistoricalPeriod).periodNumber === 'number';
}

export interface ProjectionEntry {
  date: Date;                           // Period end date
  startDate: Date;                      // Period start date
  periodNumber: number;
  income: number;
  expenses: number;
  expenseDetails: ExpenseOccurrence[];  // Breakdown of recurring expenses
  adHocIncome: number;                  // Total ad-hoc income for this period
  adHocExpenses: number;                // Total ad-hoc expenses for this period
  adHocDetails: AdHocTransaction[];     // Ad-hoc transactions for this period
  baselineSpend: number;
  startingBalance: number;              // Balance at start of period
  balanceAfterIncome: number;
  balanceAfterExpenses: number;
  balanceAfterBaseline: number;
  projectedSweep: number;
  projectedCumulativeSavings: number;
}

export interface GoalProjection {
  dateBeforeExpenses: Date | null;
  dateAfterExpenses: Date | null;
  dateAfterBaseline: Date | null;
  periodsToGoal: number;
  daysToGoal: number;
  // Flags indicating if dates are mathematical estimates (beyond projection window)
  isEstimateBeforeExpenses?: boolean;
  isEstimateAfterExpenses?: boolean;
  isEstimateAfterBaseline?: boolean;
  // Reason if goal is unreachable (null if reachable)
  unreachableReason?: 'negative_net' | 'zero_net' | 'sweep_limit' | null;
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

export const SWEEP_TRIGGER_LABELS: Record<SweepTrigger, { short: string; full: string; description: string }> = {
  afterIncome: {
    short: 'After Pay',
    full: 'After Paycheck',
    description: 'Sweep immediately after income, before bills'
  },
  afterExpenses: {
    short: 'After Bills',
    full: 'After Bills',
    description: 'Sweep after recurring expenses, before baseline'
  },
  afterBaseline: {
    short: 'After All',
    full: 'After All Spending',
    description: 'Sweep after all spending (most conservative)'
  },
};
