import type { Period, Transaction } from './types';

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
