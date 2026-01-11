import { describe, it, expect } from 'vitest';
import { migrateToStaticPeriods, needsStaticPeriodsMigration } from '../utils/migrationV2';
import type { BudgetConfig } from '../types';

describe('needsStaticPeriodsMigration', () => {
  it('returns true when adHocTransactions has items', () => {
    const config = {
      adHocTransactions: [{ id: '1', name: 'Test', amount: 50, periodNumber: 0, periodStartDate: '2026-01-01', isIncome: false }],
      periodStartSnapshot: undefined,
    } as unknown as BudgetConfig;

    expect(needsStaticPeriodsMigration(config)).toBe(true);
  });

  it('returns true when periodStartSnapshot exists', () => {
    const config = {
      adHocTransactions: [],
      periodStartSnapshot: { periodStartDate: '2026-01-01', balanceBeforePaycheck: 1000, paycheckReceived: true },
    } as unknown as BudgetConfig;

    expect(needsStaticPeriodsMigration(config)).toBe(true);
  });

  it('returns false when no migration needed', () => {
    const config = {
      adHocTransactions: [],
      periodStartSnapshot: undefined,
    } as unknown as BudgetConfig;

    expect(needsStaticPeriodsMigration(config)).toBe(false);
  });
});

describe('migrateToStaticPeriods', () => {
  it('migrates adhoc transactions into active period', () => {
    const oldConfig = {
      currentBalance: 2000,
      currentBalanceAsOf: '2026-01-10',
      paycheckAmount: 3000,
      paycheckFrequency: 'semimonthly',
      nextPayDate: '2026-01-15',
      weekendHandling: 'before',
      semiMonthlyConfig: { firstPayDay: 15, secondPayDay: 31 },
      monthlyConfig: { payDay: 1 },
      recurringExpenses: [
        { id: 'exp-1', name: 'Rent', amount: 1500, frequency: 'monthly', nextDueDate: '2026-01-01' },
      ],
      adHocTransactions: [
        { id: 'adhoc-1', periodNumber: 0, periodStartDate: '2026-01-01', name: 'Dinner', amount: 50, isIncome: false },
      ],
      baselineSpendPerPeriod: 500,
      savingsGoal: 10000,
      periodStartSnapshot: {
        periodStartDate: '2026-01-01',
        balanceBeforePaycheck: 1000,
        paycheckReceived: true,
      },
      periods: [],
      periodsForBaselineCalc: 8,
      useCalculatedBaseline: false,
      periodConfirmationGraceDays: 3,
    } as unknown as BudgetConfig;

    const newConfig = migrateToStaticPeriods(oldConfig);

    // Should have created an active period
    const activePeriod = newConfig.periods.find(p => p.status === 'active');
    expect(activePeriod).toBeDefined();
    expect(activePeriod!.startDate).toBe('2026-01-01');

    // Adhoc transaction should be embedded
    const adhocTx = activePeriod!.transactions.find(t => t.name === 'Dinner');
    expect(adhocTx).toBeDefined();
    expect(adhocTx!.type).toBe('adhoc');

    // Old fields should be cleared/removed
    expect(newConfig.adHocTransactions).toEqual([]);
    expect(newConfig.periodStartSnapshot).toBeUndefined();
  });
});
