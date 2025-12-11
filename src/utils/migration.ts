import type { BudgetConfig, HistoricalPeriod } from '../types';
import { generateUUID } from './uuid';

/**
 * Migrate existing periodSpendHistory to new periods[] structure.
 * Preserves all existing data while adding new fields.
 */
export function migrateToHistoricalPeriods(config: BudgetConfig): BudgetConfig {
  // Already migrated or no history to migrate
  if (config.periods && config.periods.length > 0) {
    return config;
  }

  const periodSpendHistory = config.periodSpendHistory ?? [];
  if (periodSpendHistory.length === 0) {
    return {
      ...config,
      periods: [],
      budgetStartDate: config.currentBalanceAsOf,
    };
  }

  // Convert old entries to new format
  const periods: HistoricalPeriod[] = periodSpendHistory.map((entry, index) => {
    const variance = entry.expectedEnding - entry.actualEnding;

    // Calculate startDate for this period
    let startDate: string;
    if (index === 0) {
      // For first period, use currentBalanceAsOf if available, otherwise use periodEndDate
      startDate = config.currentBalanceAsOf ?? entry.periodEndDate;
    } else {
      // For subsequent periods, use previous period's endDate + 1 day
      const prevEndDate = new Date(periodSpendHistory[index - 1].periodEndDate);
      prevEndDate.setDate(prevEndDate.getDate() + 1);
      startDate = prevEndDate.toISOString().split('T')[0];
    }

    return {
      id: generateUUID(),
      periodNumber: index,
      startDate,
      endDate: entry.periodEndDate,
      startingBalance: entry.startingBalance,
      endingBalance: entry.actualEnding,
      projectedEndingBalance: entry.expectedEnding,
      income: 0, // Not tracked in old format
      recurringExpenses: 0, // Not tracked in old format
      adHocIncome: 0,
      adHocExpenses: 0,
      baselineSpend: entry.trueSpend,
      variance,
      varianceExplanations: variance < 0 ? [{
        reason: 'baseline_miss' as const,
        amount: Math.abs(variance),
        affectsBaseline: true,
      }] : [],
      status: 'completed' as const,
      confirmedAt: new Date().toISOString(),
    };
  });

  // Set budgetStartDate to earliest period or currentBalanceAsOf or current date
  const earliestDate = periods.length > 0
    ? periods[0].startDate
    : (config.currentBalanceAsOf ?? new Date().toISOString().split('T')[0]);

  return {
    ...config,
    periods,
    budgetStartDate: earliestDate,
    periodConfirmationGraceDays: config.periodConfirmationGraceDays ?? 3,
  };
}

/**
 * Check if migration is needed
 */
export function needsMigration(config: BudgetConfig): boolean {
  const hasOldHistory = (config.periodSpendHistory ?? []).length > 0;
  const hasNewHistory = (config.periods ?? []).length > 0;
  return hasOldHistory && !hasNewHistory;
}
