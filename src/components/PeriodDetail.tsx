import { useState } from 'react';
import { format, isBefore, startOfDay } from 'date-fns';
import type { ProjectionEntry, AdHocTransaction, ActualPeriodBalance } from '../types';
import { formatCurrency } from '../calculations';

interface PeriodDetailProps {
  period: ProjectionEntry;
  adHocTransactions: AdHocTransaction[];
  onAddTransaction: (txn: Omit<AdHocTransaction, 'id'>) => void;
  onUpdateTransaction: (txn: AdHocTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onBack: () => void;
  // Actual balance tracking
  actualBalance?: ActualPeriodBalance;
  onSaveActualBalance: (periodNumber: number, endingBalance: number) => void;
  onDeleteActualBalance: (periodNumber: number) => void;
}

interface NewTransaction {
  name: string;
  amount: string;
  isIncome: boolean;
}

const EMPTY_NEW_TRANSACTION: NewTransaction = {
  name: '',
  amount: '',
  isIncome: false,
};

export function PeriodDetail({
  period,
  adHocTransactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onBack,
  actualBalance,
  onSaveActualBalance,
  onDeleteActualBalance,
}: PeriodDetailProps) {
  const [newTransaction, setNewTransaction] = useState<NewTransaction>(EMPTY_NEW_TRANSACTION);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTransaction, setEditTransaction] = useState<NewTransaction>(EMPTY_NEW_TRANSACTION);

  // Actual balance editing state
  const [actualBalanceInput, setActualBalanceInput] = useState<string>(
    actualBalance ? actualBalance.endingBalance.toString() : ''
  );
  const [isEditingActual, setIsEditingActual] = useState(false);

  // Check if period is in the past (can record actual balance)
  const today = startOfDay(new Date());
  const periodDate = startOfDay(period.date);
  const isPastPeriod = isBefore(periodDate, today) || periodDate.getTime() === today.getTime();

  const handleAdd = () => {
    const amount = parseFloat(newTransaction.amount);
    if (!newTransaction.name.trim() || isNaN(amount) || amount <= 0) return;

    onAddTransaction({
      periodNumber: period.periodNumber,
      name: newTransaction.name.trim(),
      amount,
      isIncome: newTransaction.isIncome,
    });
    setNewTransaction(EMPTY_NEW_TRANSACTION);
  };

  const handleStartEdit = (txn: AdHocTransaction) => {
    setEditingId(txn.id);
    setEditTransaction({
      name: txn.name,
      amount: txn.amount.toString(),
      isIncome: txn.isIncome,
    });
  };

  const handleSaveEdit = (txn: AdHocTransaction) => {
    const amount = parseFloat(editTransaction.amount);
    if (!editTransaction.name.trim() || isNaN(amount) || amount <= 0) return;

    onUpdateTransaction({
      ...txn,
      name: editTransaction.name.trim(),
      amount,
      isIncome: editTransaction.isIncome,
    });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTransaction(EMPTY_NEW_TRANSACTION);
  };

  const handleSaveActual = () => {
    const balance = parseFloat(actualBalanceInput);
    if (isNaN(balance)) return;
    onSaveActualBalance(period.periodNumber, balance);
    setIsEditingActual(false);
  };

  const handleDeleteActual = () => {
    onDeleteActualBalance(period.periodNumber);
    setActualBalanceInput('');
    setIsEditingActual(false);
  };

  // Calculate variance if actual balance exists
  const variance = actualBalance
    ? period.balanceAfterBaseline - actualBalance.endingBalance
    : null;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="ml-1 font-medium">Back</span>
        </button>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-primary-900">
            Period {period.periodNumber}
          </h2>
          <p className="text-sm text-neutral-500">{format(period.date, 'MMMM d, yyyy')}</p>
        </div>
      </div>

      {/* Balance summary cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 hide-scrollbar md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible">
        <div className="flex-shrink-0 w-[140px] md:w-auto relative overflow-hidden rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100/50 p-4">
          <div className="absolute top-0 right-0 w-12 h-12 -mr-3 -mt-3 bg-primary-200/30 rounded-full blur-xl"></div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-1">After Income</p>
          <p className="text-xl md:text-2xl font-bold text-primary-900 tabular-nums">
            {formatCurrency(period.balanceAfterIncome)}
          </p>
        </div>
        <div className="flex-shrink-0 w-[140px] md:w-auto relative overflow-hidden rounded-xl border border-warning-200 bg-gradient-to-br from-warning-50 to-warning-100/50 p-4">
          <div className="absolute top-0 right-0 w-12 h-12 -mr-3 -mt-3 bg-warning-200/30 rounded-full blur-xl"></div>
          <p className="text-xs font-semibold uppercase tracking-wider text-warning-600 mb-1">After Expenses</p>
          <p className="text-xl md:text-2xl font-bold text-warning-700 tabular-nums">
            {formatCurrency(period.balanceAfterExpenses)}
          </p>
        </div>
        <div className={`flex-shrink-0 w-[140px] md:w-auto relative overflow-hidden rounded-xl border-2 p-4 ${
          period.balanceAfterBaseline < 0
            ? 'border-danger-200 bg-gradient-to-br from-danger-50 to-danger-100/50'
            : 'border-accent-300 bg-gradient-to-br from-accent-50 to-accent-100/50 ring-1 ring-accent-400/20'
        }`}>
          <div className={`absolute top-0 right-0 w-14 h-14 -mr-4 -mt-4 rounded-full blur-2xl ${
            period.balanceAfterBaseline < 0 ? 'bg-danger-200/30' : 'bg-accent-300/30'
          }`}></div>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
            period.balanceAfterBaseline < 0 ? 'text-danger-600' : 'text-accent-700'
          }`}>
            After Baseline
          </p>
          <p className={`text-xl md:text-2xl font-bold tabular-nums ${
            period.balanceAfterBaseline < 0 ? 'text-danger-700' : 'text-accent-800'
          }`}>
            {formatCurrency(period.balanceAfterBaseline)}
          </p>
        </div>
      </div>

      {/* Period breakdown */}
      <div className="bg-white rounded-xl border border-neutral-200/60 shadow-sm p-4 md:p-5">
        <h3 className="text-base font-semibold text-primary-800 mb-3">Period Breakdown</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-neutral-600">Paycheck</span>
            <span className="text-accent-600 font-medium tabular-nums">+{formatCurrency(period.income)}</span>
          </div>
          {period.adHocIncome > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-neutral-600">Ad-hoc Income</span>
              <span className="text-accent-600 font-medium tabular-nums">+{formatCurrency(period.adHocIncome)}</span>
            </div>
          )}
          <div className="flex justify-between py-1">
            <span className="text-neutral-600">Recurring Expenses</span>
            <span className="text-danger-600 font-medium tabular-nums">-{formatCurrency(period.expenses)}</span>
          </div>
          {period.adHocExpenses > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-neutral-600">Ad-hoc Expenses</span>
              <span className="text-danger-600 font-medium tabular-nums">-{formatCurrency(period.adHocExpenses)}</span>
            </div>
          )}
          <div className="flex justify-between py-1">
            <span className="text-neutral-600">Baseline Spend</span>
            <span className="text-warning-600 font-medium tabular-nums">-{formatCurrency(period.baselineSpend)}</span>
          </div>
        </div>
      </div>

      {/* Actual Balance Section - only show for past/current periods */}
      {isPastPeriod && (
        <div className="bg-white rounded-xl border border-neutral-200/60 shadow-sm p-4 md:p-5">
          <h3 className="text-base font-semibold text-primary-800 mb-3">Actual Balance</h3>

          {actualBalance && !isEditingActual ? (
            // Display recorded balance with variance
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Recorded ending balance</p>
                  <p className="text-xl font-bold text-primary-900 tabular-nums">
                    {formatCurrency(actualBalance.endingBalance)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setActualBalanceInput(actualBalance.endingBalance.toString());
                      setIsEditingActual(true);
                    }}
                    className="px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteActual}
                    className="px-3 py-2 text-sm font-medium text-danger-600 hover:text-danger-800 hover:bg-danger-50 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Variance display */}
              {variance !== null && (
                <div className="pt-3 border-t border-neutral-200">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">Projection Accuracy</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-neutral-500">Projected</p>
                      <p className="font-medium tabular-nums">{formatCurrency(period.balanceAfterBaseline)}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Actual</p>
                      <p className="font-medium tabular-nums">{formatCurrency(actualBalance.endingBalance)}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Variance</p>
                      <p className={`font-medium tabular-nums ${
                        variance > 0 ? 'text-danger-600' : variance < 0 ? 'text-accent-600' : 'text-neutral-600'
                      }`}>
                        {variance > 0 ? '-' : variance < 0 ? '+' : ''}{formatCurrency(Math.abs(variance))}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    {variance > 0
                      ? `Spent ${formatCurrency(variance)} more than projected`
                      : variance < 0
                      ? `Saved ${formatCurrency(Math.abs(variance))} more than projected`
                      : 'Projection was exactly accurate'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Entry form
            <div>
              <p className="text-sm text-neutral-500 mb-3">
                Record your actual ending balance for this period to improve baseline calculations.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={actualBalanceInput}
                    onChange={(e) => setActualBalanceInput(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full pl-7 pr-3 py-2.5 border border-neutral-300 rounded-lg text-sm transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <button
                  onClick={handleSaveActual}
                  disabled={!actualBalanceInput || isNaN(parseFloat(actualBalanceInput))}
                  className="px-4 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all duration-150 hover:bg-primary-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                {isEditingActual && (
                  <button
                    onClick={() => {
                      setIsEditingActual(false);
                      setActualBalanceInput(actualBalance?.endingBalance.toString() ?? '');
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recurring Expenses */}
      {period.expenseDetails.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200/60 shadow-sm p-4 md:p-5">
          <h3 className="text-base font-semibold text-primary-800 mb-3">Recurring Expenses</h3>
          <ul className="space-y-2">
            {period.expenseDetails.map((expense, idx) => (
              <li key={idx} className="flex justify-between items-center text-sm py-1">
                <span className="text-neutral-700">
                  {expense.name}
                  <span className="text-neutral-400 ml-2 text-xs">({format(expense.date, 'MMM d')})</span>
                </span>
                <span className="text-danger-600 font-medium tabular-nums">-{formatCurrency(expense.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ad-hoc Transactions */}
      <div className="bg-white rounded-xl border border-neutral-200/60 shadow-sm p-4 md:p-5">
        <h3 className="text-base font-semibold text-primary-800 mb-3">One-Time Transactions</h3>

        {/* Existing ad-hoc transactions */}
        {adHocTransactions.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {adHocTransactions.map((txn) => (
              <li key={txn.id} className="flex items-center justify-between text-sm py-2 border-b border-neutral-100 last:border-0">
                {editingId === txn.id ? (
                  <div className="flex-1 flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
                    <input
                      type="text"
                      value={editTransaction.name}
                      onChange={(e) => setEditTransaction(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm md:flex-1"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={editTransaction.amount}
                        onChange={(e) => setEditTransaction(prev => ({ ...prev, amount: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm md:w-24 md:flex-none"
                        min="0"
                        step="0.01"
                      />
                      <select
                        value={editTransaction.isIncome ? 'income' : 'expense'}
                        onChange={(e) => setEditTransaction(prev => ({ ...prev, isIncome: e.target.value === 'income' }))}
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm md:flex-none"
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(txn)}
                        className="flex-1 md:flex-none px-3 py-2 text-sm font-medium text-accent-600 hover:text-accent-800 hover:bg-accent-50 rounded-lg transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 md:flex-none px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        txn.isIncome
                          ? 'bg-accent-100 text-accent-700'
                          : 'bg-danger-100 text-danger-700'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${txn.isIncome ? 'bg-accent-500' : 'bg-danger-500'}`}></span>
                        {txn.isIncome ? 'Income' : 'Expense'}
                      </span>
                      <span className="text-neutral-700">{txn.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium tabular-nums ${txn.isIncome ? 'text-accent-600' : 'text-danger-600'}`}>
                        {txn.isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                      </span>
                      <button
                        onClick={() => handleStartEdit(txn)}
                        className="px-2 py-1 rounded-md text-xs font-medium text-neutral-600 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(txn.id)}
                        className="px-2 py-1 rounded-md text-xs font-medium text-neutral-600 hover:text-danger-700 hover:bg-danger-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-6 text-center text-neutral-500 mb-4">
            <p className="mb-1">No one-time transactions</p>
            <p className="text-xs">Add expected income or expenses specific to this pay period</p>
          </div>
        )}

        {/* Add new transaction form */}
        <div className="pt-4 border-t border-neutral-200">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-3">Add Transaction</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex md:items-center md:gap-2">
            <input
              type="text"
              value={newTransaction.name}
              onChange={(e) => setNewTransaction(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Name"
              className="w-full sm:col-span-2 md:flex-1 md:min-w-[150px] px-3 py-2.5 border border-neutral-300 rounded-lg text-sm transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            <input
              type="number"
              inputMode="decimal"
              value={newTransaction.amount}
              onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Amount"
              className="w-full md:w-28 px-3 py-2.5 border border-neutral-300 rounded-lg text-sm transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              min="0"
              step="0.01"
            />
            <select
              value={newTransaction.isIncome ? 'income' : 'expense'}
              onChange={(e) => setNewTransaction(prev => ({ ...prev, isIncome: e.target.value === 'income' }))}
              className="w-full md:w-auto px-3 py-2.5 border border-neutral-300 rounded-lg text-sm transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={!newTransaction.name.trim() || !newTransaction.amount}
              className="w-full md:w-auto py-3 px-4 bg-primary-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all duration-150 hover:bg-primary-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed md:py-2.5"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
