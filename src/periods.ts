import type { Period, Transaction, RecurringExpense } from './types';
import { generateUUID } from './utils/uuid';
import { generateExpenseOccurrences } from './calculations';
import { parseISO, startOfDay, addDays } from 'date-fns';

/**
 * Get the effective starting balance for a period.
 * Uses actualStartingBalance if set, otherwise calculatedStartingBalance.
 */
export function getEffectiveStartingBalance(period: Period): number {
  return period.actualStartingBalance ?? period.calculatedStartingBalance;
}

/**
 * Calculate total expenses from transactions (non-income items).
 */
export function calculatePeriodExpenses(transactions: Transaction[]): number {
  return transactions
    .filter(t => !t.isIncome)
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculate total adhoc income from transactions.
 */
export function calculatePeriodAdhocIncome(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.isIncome)
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculate the ending balance for a period.
 * Formula: startingBalance + income + adhocIncome - expenses - baselineSpend
 */
export function calculatePeriodEndingBalance(period: Period): number {
  const startingBalance = getEffectiveStartingBalance(period);
  const expenses = calculatePeriodExpenses(period.transactions);
  const adhocIncome = calculatePeriodAdhocIncome(period.transactions);

  return startingBalance + period.income + adhocIncome - expenses - period.baselineSpend;
}

/**
 * Generate recurring expense transactions for a date range.
 */
export function generateRecurringTransactions(
  recurringExpenses: RecurringExpense[],
  periodStart: string,
  periodEnd: string
): Transaction[] {
  const startDate = parseISO(periodStart);
  const endDate = parseISO(periodEnd);

  const occurrences = generateExpenseOccurrences(
    recurringExpenses,
    startDate,
    addDays(endDate, 1)  // Include end date
  );

  // Filter to only those within the period
  const filtered = occurrences.filter(occ => {
    const occDate = startOfDay(occ.date);
    return occDate >= startOfDay(startDate) && occDate <= startOfDay(endDate);
  });

  return filtered.map(occ => ({
    id: generateUUID(),
    name: occ.name,
    amount: occ.amount,
    date: occ.date.toISOString().split('T')[0],
    type: 'recurring' as const,
    isIncome: false,
    recurringExpenseId: occ.expenseId,
  }));
}

interface CreatePeriodParams {
  startDate: string;
  endDate: string;
  calculatedStartingBalance: number;
  income: number;
  baselineSpend: number;
  recurringExpenses: RecurringExpense[];
  actualStartingBalance?: number;
}

/**
 * Create a new period with generated recurring transactions.
 */
export function createPeriod(params: CreatePeriodParams): Period {
  const {
    startDate,
    endDate,
    calculatedStartingBalance,
    income,
    baselineSpend,
    recurringExpenses,
    actualStartingBalance,
  } = params;

  const transactions = generateRecurringTransactions(
    recurringExpenses,
    startDate,
    endDate
  );

  return {
    id: `period-${startDate}-${generateUUID().slice(0, 8)}`,
    startDate,
    endDate,
    status: 'active',
    calculatedStartingBalance,
    actualStartingBalance,
    income,
    transactions,
    baselineSpend,
  };
}

/**
 * Mark a period as completed.
 */
export function completePeriod(period: Period): Period {
  return {
    ...period,
    status: 'completed',
  };
}

interface TransitionParams {
  currentPeriod: Period;
  newEndDate: string;
  income: number;
  baselineSpend: number;
  recurringExpenses: RecurringExpense[];
}

/**
 * Complete the current period and create a new active period.
 */
export function transitionToNewPeriod(params: TransitionParams): {
  completedPeriod: Period;
  newPeriod: Period;
} {
  const { currentPeriod, newEndDate, income, baselineSpend, recurringExpenses } = params;

  const completedPeriod = completePeriod(currentPeriod);
  const newStartingBalance = calculatePeriodEndingBalance(currentPeriod);

  const newPeriod = createPeriod({
    startDate: currentPeriod.endDate,
    endDate: newEndDate,
    calculatedStartingBalance: newStartingBalance,
    income,
    baselineSpend,
    recurringExpenses,
  });

  return { completedPeriod, newPeriod };
}
