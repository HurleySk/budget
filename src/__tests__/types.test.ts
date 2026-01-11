import { describe, it, expect } from 'vitest';
import type { Transaction, Period } from '../types';

describe('Transaction type', () => {
  it('should allow creating a recurring expense transaction', () => {
    const transaction: Transaction = {
      id: 'tx-1',
      name: 'Mortgage',
      amount: 1600,
      date: '2026-01-01',
      type: 'recurring',
      isIncome: false,
      recurringExpenseId: 'exp-1',
    };
    expect(transaction.type).toBe('recurring');
    expect(transaction.recurringExpenseId).toBe('exp-1');
  });

  it('should allow creating an adhoc transaction', () => {
    const transaction: Transaction = {
      id: 'tx-2',
      name: 'Dinner out',
      amount: 45,
      date: '2026-01-05',
      type: 'adhoc',
      isIncome: false,
    };
    expect(transaction.type).toBe('adhoc');
    expect(transaction.recurringExpenseId).toBeUndefined();
  });
});

describe('Period type', () => {
  it('should use actualStartingBalance when set', () => {
    const period: Period = {
      id: 'period-2026-01-01',
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      status: 'active',
      calculatedStartingBalance: 1000,
      actualStartingBalance: 1100,
      income: 3000,
      transactions: [],
      baselineSpend: 500,
    };
    const effectiveBalance = period.actualStartingBalance ?? period.calculatedStartingBalance;
    expect(effectiveBalance).toBe(1100);
  });

  it('should fall back to calculatedStartingBalance when actualStartingBalance not set', () => {
    const period: Period = {
      id: 'period-2026-01-01',
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      status: 'active',
      calculatedStartingBalance: 1000,
      income: 3000,
      transactions: [],
      baselineSpend: 500,
    };
    const effectiveBalance = period.actualStartingBalance ?? period.calculatedStartingBalance;
    expect(effectiveBalance).toBe(1000);
  });
});
