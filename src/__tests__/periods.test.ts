import { describe, it, expect } from 'vitest';
import {
  getEffectiveStartingBalance,
  calculatePeriodEndingBalance,
  calculatePeriodExpenses,
  createPeriod,
  generateRecurringTransactions,
  completePeriod,
  transitionToNewPeriod,
} from '../periods';
import type { Period, Transaction, RecurringExpense } from '../types';

describe('getEffectiveStartingBalance', () => {
  it('returns actualStartingBalance when set', () => {
    const period: Period = {
      id: 'p1',
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      status: 'active',
      calculatedStartingBalance: 1000,
      actualStartingBalance: 1200,
      income: 3000,
      transactions: [],
      baselineSpend: 500,
    };
    expect(getEffectiveStartingBalance(period)).toBe(1200);
  });

  it('returns calculatedStartingBalance when actualStartingBalance not set', () => {
    const period: Period = {
      id: 'p1',
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      status: 'active',
      calculatedStartingBalance: 1000,
      income: 3000,
      transactions: [],
      baselineSpend: 500,
    };
    expect(getEffectiveStartingBalance(period)).toBe(1000);
  });
});

describe('calculatePeriodExpenses', () => {
  it('sums non-income transactions', () => {
    const transactions: Transaction[] = [
      { id: '1', name: 'Rent', amount: 1500, date: '2026-01-01', type: 'recurring', isIncome: false },
      { id: '2', name: 'Food', amount: 200, date: '2026-01-05', type: 'adhoc', isIncome: false },
      { id: '3', name: 'Bonus', amount: 500, date: '2026-01-10', type: 'adhoc', isIncome: true },
    ];
    expect(calculatePeriodExpenses(transactions)).toBe(1700);
  });

  it('returns 0 for empty transactions', () => {
    expect(calculatePeriodExpenses([])).toBe(0);
  });
});

describe('calculatePeriodEndingBalance', () => {
  it('calculates ending balance correctly', () => {
    const period: Period = {
      id: 'p1',
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      status: 'active',
      calculatedStartingBalance: 1000,
      income: 3000,
      transactions: [
        { id: '1', name: 'Rent', amount: 1500, date: '2026-01-01', type: 'recurring', isIncome: false },
      ],
      baselineSpend: 500,
    };
    // 1000 + 3000 - 1500 - 500 = 2000
    expect(calculatePeriodEndingBalance(period)).toBe(2000);
  });

  it('uses actualStartingBalance when set', () => {
    const period: Period = {
      id: 'p1',
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      status: 'active',
      calculatedStartingBalance: 1000,
      actualStartingBalance: 1200,
      income: 3000,
      transactions: [],
      baselineSpend: 500,
    };
    // 1200 + 3000 - 0 - 500 = 3700
    expect(calculatePeriodEndingBalance(period)).toBe(3700);
  });

  it('includes adhoc income in calculation', () => {
    const period: Period = {
      id: 'p1',
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      status: 'active',
      calculatedStartingBalance: 1000,
      income: 3000,
      transactions: [
        { id: '1', name: 'Bonus', amount: 500, date: '2026-01-10', type: 'adhoc', isIncome: true },
      ],
      baselineSpend: 500,
    };
    // 1000 + 3000 + 500 - 500 = 4000
    expect(calculatePeriodEndingBalance(period)).toBe(4000);
  });
});

describe('generateRecurringTransactions', () => {
  it('generates transactions for expenses within date range', () => {
    const expenses: RecurringExpense[] = [
      { id: 'exp-1', name: 'Rent', amount: 1500, frequency: 'monthly', nextDueDate: '2026-01-01' },
      { id: 'exp-2', name: 'Internet', amount: 80, frequency: 'monthly', nextDueDate: '2026-01-15' },
    ];
    const transactions = generateRecurringTransactions(
      expenses,
      '2026-01-01',
      '2026-01-14'
    );

    expect(transactions).toHaveLength(1);
    expect(transactions[0].name).toBe('Rent');
    expect(transactions[0].amount).toBe(1500);
    expect(transactions[0].type).toBe('recurring');
    expect(transactions[0].recurringExpenseId).toBe('exp-1');
  });

  it('excludes expenses outside date range', () => {
    const expenses: RecurringExpense[] = [
      { id: 'exp-1', name: 'Rent', amount: 1500, frequency: 'monthly', nextDueDate: '2026-02-01' },
    ];
    const transactions = generateRecurringTransactions(
      expenses,
      '2026-01-01',
      '2026-01-31'
    );

    expect(transactions).toHaveLength(0);
  });
});

describe('createPeriod', () => {
  it('creates a new active period with recurring transactions', () => {
    const expenses: RecurringExpense[] = [
      { id: 'exp-1', name: 'Rent', amount: 1500, frequency: 'monthly', nextDueDate: '2026-01-01' },
    ];

    const period = createPeriod({
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      calculatedStartingBalance: 1000,
      income: 3000,
      baselineSpend: 500,
      recurringExpenses: expenses,
    });

    expect(period.id).toMatch(/^period-2026-01-01-/);
    expect(period.status).toBe('active');
    expect(period.transactions).toHaveLength(1);
    expect(period.transactions[0].name).toBe('Rent');
  });
});

describe('completePeriod', () => {
  it('marks period as completed', () => {
    const period: Period = {
      id: 'p1',
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      status: 'active',
      calculatedStartingBalance: 1000,
      income: 3000,
      transactions: [],
      baselineSpend: 500,
    };

    const completed = completePeriod(period);

    expect(completed.status).toBe('completed');
    expect(completed.id).toBe(period.id);
  });
});

describe('transitionToNewPeriod', () => {
  it('completes old period and creates new one', () => {
    const oldPeriod: Period = {
      id: 'p1',
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      status: 'active',
      calculatedStartingBalance: 1000,
      income: 3000,
      transactions: [
        { id: '1', name: 'Rent', amount: 1500, date: '2026-01-01', type: 'recurring', isIncome: false },
      ],
      baselineSpend: 500,
    };

    const recurringExpenses: RecurringExpense[] = [
      { id: 'exp-1', name: 'Rent', amount: 1500, frequency: 'monthly', nextDueDate: '2026-02-01' },
    ];

    const { completedPeriod, newPeriod } = transitionToNewPeriod({
      currentPeriod: oldPeriod,
      newEndDate: '2026-01-31',
      income: 3000,
      baselineSpend: 500,
      recurringExpenses,
    });

    expect(completedPeriod.status).toBe('completed');
    expect(newPeriod.status).toBe('active');
    expect(newPeriod.startDate).toBe('2026-01-15');
    expect(newPeriod.endDate).toBe('2026-01-31');
    // Old period ending: 1000 + 3000 - 1500 - 500 = 2000
    expect(newPeriod.calculatedStartingBalance).toBe(2000);
  });
});
