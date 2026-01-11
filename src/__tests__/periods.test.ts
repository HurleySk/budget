import { describe, it, expect } from 'vitest';
import {
  getEffectiveStartingBalance,
  calculatePeriodEndingBalance,
  calculatePeriodExpenses,
} from '../periods';
import type { Period, Transaction } from '../types';

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
