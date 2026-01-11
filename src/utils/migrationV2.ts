import type { BudgetConfig, Period, Transaction, AdHocTransaction } from '../types';
import { generateUUID } from './uuid';
import { generateRecurringTransactions } from '../periods';
import { generatePayDates } from '../calculations';
import { addDays } from 'date-fns';

/**
 * Check if config needs migration to static periods model.
 */
export function needsStaticPeriodsMigration(config: BudgetConfig): boolean {
  // If there are adhoc transactions in the old array, needs migration
  if (config.adHocTransactions && config.adHocTransactions.length > 0) {
    return true;
  }

  // If periodStartSnapshot exists (old model), needs migration
  if (config.periodStartSnapshot) {
    return true;
  }

  return false;
}

/**
 * Convert old AdHocTransaction to new Transaction format.
 */
function convertAdhocTransaction(adhoc: AdHocTransaction): Transaction {
  return {
    id: adhoc.id,
    name: adhoc.name,
    amount: adhoc.amount,
    date: adhoc.periodStartDate ?? new Date().toISOString().split('T')[0],
    type: 'adhoc',
    isIncome: adhoc.isIncome,
  };
}

/**
 * Migrate from computed Period 0 model to static periods model.
 *
 * This migration:
 * 1. Converts existing HistoricalPeriod entries to the new Period format
 * 2. Creates an active period from periodStartSnapshot if it exists
 * 3. Embeds adhoc transactions into their respective periods
 * 4. Clears the old adHocTransactions array and periodStartSnapshot
 */
export function migrateToStaticPeriods(config: BudgetConfig): BudgetConfig & { periods: Period[] } {
  const newPeriods: Period[] = [];

  // Convert existing completed historical periods
  for (const oldPeriod of config.periods) {
    if (oldPeriod.status === 'completed' || oldPeriod.status === 'pending-confirmation') {
      // Find adhoc transactions for this period
      const periodAdhocs = config.adHocTransactions.filter(
        t => t.periodStartDate === oldPeriod.startDate
      );

      const adhocTransactions: Transaction[] = periodAdhocs.map(convertAdhocTransaction);

      // Generate recurring expense transactions for this period
      const recurringTxs = generateRecurringTransactions(
        config.recurringExpenses,
        oldPeriod.startDate,
        oldPeriod.endDate
      );

      newPeriods.push({
        id: oldPeriod.id,
        startDate: oldPeriod.startDate,
        endDate: oldPeriod.endDate,
        status: 'completed',
        calculatedStartingBalance: oldPeriod.startingBalance,
        income: oldPeriod.income,
        transactions: [...recurringTxs, ...adhocTransactions],
        baselineSpend: oldPeriod.baselineSpend,
        savingsSwept: oldPeriod.savingsSwept,
        cumulativeSavings: oldPeriod.cumulativeSavings,
      });
    }
  }

  // Create active period from periodStartSnapshot if it exists
  if (config.periodStartSnapshot) {
    const snapshot = config.periodStartSnapshot;

    // Find the next pay date for end date
    const payDates = generatePayDates(config, 3);
    const today = new Date();
    const nextPayDate = payDates.find(d => d > today) ?? addDays(today, 14);
    const endDate = nextPayDate.toISOString().split('T')[0];

    // Find adhoc transactions for the active period
    const activeAdhocs = config.adHocTransactions.filter(
      t => t.periodStartDate === snapshot.periodStartDate
    );

    // Generate recurring transactions for active period
    const recurringTxs = generateRecurringTransactions(
      config.recurringExpenses,
      snapshot.periodStartDate,
      endDate
    );

    const activePeriod: Period = {
      id: `period-${snapshot.periodStartDate}-${generateUUID().slice(0, 8)}`,
      startDate: snapshot.periodStartDate,
      endDate,
      status: 'active',
      calculatedStartingBalance: snapshot.balanceBeforePaycheck,
      actualStartingBalance: config.currentBalance !== snapshot.balanceBeforePaycheck
        ? config.currentBalance
        : undefined,
      income: snapshot.paycheckReceived ? config.paycheckAmount : 0,
      transactions: [
        ...recurringTxs,
        ...activeAdhocs.map(convertAdhocTransaction),
      ],
      baselineSpend: config.baselineSpendPerPeriod,
    };

    newPeriods.push(activePeriod);
  }

  // Return new config with migrated data
  // Note: We cast periods to any temporarily since BudgetConfig.periods is typed as HistoricalPeriod[]
  // This will be resolved when the type definition is updated in a later task
  return {
    ...config,
    periods: newPeriods,
    adHocTransactions: [],  // Clear old array
    periodStartSnapshot: undefined,  // Remove old snapshot
    currentBalanceAsOf: undefined,  // No longer needed
  } as BudgetConfig & { periods: Period[] };
}
