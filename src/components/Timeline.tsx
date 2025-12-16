import { useState } from 'react';
import type { ProjectionEntry, HistoricalPeriod, AdHocTransaction } from '../types';
import { formatCurrency } from '../calculations';
import { format } from 'date-fns';

type BalanceView = 'afterIncome' | 'afterExpenses' | 'afterBaseline';

interface TimelineProps {
  projection: ProjectionEntry[];
  historicalPeriods: HistoricalPeriod[];
  adHocTransactions: AdHocTransaction[];
  balanceView: BalanceView;
  onBalanceViewChange: (view: BalanceView) => void;
  onAddTransaction: (periodNumber: number) => void;
  onUpdateTransaction: (txn: AdHocTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateStartingBalance: (periodNumber: number, balance: number) => void;
  onConfirmPeriod: (period: HistoricalPeriod) => void;
  onBack: () => void;
}

function formatShortDate(date: Date): string {
  return format(date, 'MMM d');
}

export function Timeline({
  projection,
  historicalPeriods,
  adHocTransactions,
  balanceView,
  onBalanceViewChange,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onUpdateStartingBalance,
  onConfirmPeriod,
  onBack,
}: TimelineProps) {
  const [expandedPeriods, setExpandedPeriods] = useState<Set<number>>(() => new Set([0]));
  const [editingTxnId, setEditingTxnId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; amount: string; isIncome: boolean } | null>(null);

  // State for editing any balance checkpoint
  type CheckpointType = 'start' | 'afterIncome' | 'afterExpense' | 'afterBaseline' | 'afterAdHoc';
  const [editingCheckpoint, setEditingCheckpoint] = useState<{
    periodNumber: number;
    type: CheckpointType;
    index?: number;  // For expenses/ad-hocs: which one
  } | null>(null);
  const [checkpointInput, setCheckpointInput] = useState<string>('');

  const toggleExpand = (periodNumber: number) => {
    setExpandedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(periodNumber)) {
        next.delete(periodNumber);
      } else {
        next.add(periodNumber);
      }
      return next;
    });
  };

  const getPeriodStatus = (period: ProjectionEntry): 'active' | 'pending' | 'completed' | 'future' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(period.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(period.date);
    end.setHours(0, 0, 0, 0);

    // Today falls within this period's date range = active
    // Use exclusive end (today < end) because period.date is when next paycheck arrives
    // On payday, you're in the NEW period that starts that day
    if (today >= start && today < end) {
      return 'active';
    }

    // Check historical status
    const historical = historicalPeriods.find(p => p.periodNumber === period.periodNumber);
    if (historical?.status === 'pending-confirmation') return 'pending';
    if (historical?.status === 'completed') return 'completed';

    // Before start = future, after end = past (show as completed even if not confirmed)
    return today < start ? 'future' : 'completed';
  };

  const getHistoricalData = (periodNumber: number) => {
    return historicalPeriods.find(p => p.periodNumber === periodNumber);
  };

  const getPrimaryBalance = (period: ProjectionEntry): number => {
    switch (balanceView) {
      case 'afterIncome': return period.balanceAfterIncome;
      case 'afterExpenses': return period.balanceAfterExpenses;
      case 'afterBaseline': return period.balanceAfterBaseline;
    }
  };

  const viewLabels: Record<BalanceView, string> = {
    afterIncome: 'After Paycheck',
    afterExpenses: 'After Bills',
    afterBaseline: 'After All',
  };

  const startEdit = (txn: AdHocTransaction) => {
    setEditingTxnId(txn.id);
    setEditForm({ name: txn.name, amount: txn.amount.toString(), isIncome: txn.isIncome });
  };

  const saveEdit = (txn: AdHocTransaction) => {
    if (editForm && editForm.name && editForm.amount) {
      onUpdateTransaction({
        ...txn,
        name: editForm.name,
        amount: parseFloat(editForm.amount) || 0,
        isIncome: editForm.isIncome,
      });
    }
    setEditingTxnId(null);
    setEditForm(null);
  };

  const cancelEdit = () => {
    setEditingTxnId(null);
    setEditForm(null);
  };

  // Checkpoint edit helpers
  const startEditCheckpoint = (
    periodNumber: number,
    type: CheckpointType,
    currentBalance: number,
    index?: number
  ) => {
    setEditingCheckpoint({ periodNumber, type, index });
    setCheckpointInput(currentBalance.toFixed(2));
  };

  const saveCheckpoint = (period: ProjectionEntry, periodTxns: AdHocTransaction[]) => {
    if (!editingCheckpoint) return;
    const parsed = parseFloat(checkpointInput);
    if (isNaN(parsed)) {
      cancelCheckpointEdit();
      return;
    }

    // Calculate effective starting balance by reversing from the checkpoint
    let effectiveStart = parsed;
    const { type, index } = editingCheckpoint;

    // Work backwards based on checkpoint type
    if (type === 'afterAdHoc' && index !== undefined) {
      // Reverse ad-hocs from index back to 0
      for (let i = index; i >= 0; i--) {
        effectiveStart += periodTxns[i].isIncome ? -periodTxns[i].amount : periodTxns[i].amount;
      }
      // Then reverse baseline, expenses, income
      effectiveStart += period.baselineSpend;
      effectiveStart += period.expenses;
      effectiveStart -= period.income;
    } else if (type === 'afterBaseline') {
      // Reverse baseline, expenses, income
      effectiveStart += period.baselineSpend;
      effectiveStart += period.expenses;
      effectiveStart -= period.income;
    } else if (type === 'afterExpense' && index !== undefined) {
      // Reverse expenses from index back to 0, then income
      for (let i = index; i >= 0; i--) {
        effectiveStart += period.expenseDetails[i].amount;
      }
      effectiveStart -= period.income;
    } else if (type === 'afterIncome') {
      // Just reverse income
      effectiveStart -= period.income;
    }
    // 'start' type needs no reversal

    onUpdateStartingBalance(editingCheckpoint.periodNumber, effectiveStart);
    cancelCheckpointEdit();
  };

  const cancelCheckpointEdit = () => {
    setEditingCheckpoint(null);
    setCheckpointInput('');
  };

  // Check if editing this specific checkpoint
  const isEditingCheckpoint = (periodNumber: number, type: CheckpointType, index?: number): boolean => {
    if (!editingCheckpoint) return false;
    return editingCheckpoint.periodNumber === periodNumber &&
           editingCheckpoint.type === type &&
           editingCheckpoint.index === index;
  };

  // Check if a period has started (can be edited)
  const hasPeriodStarted = (period: ProjectionEntry): boolean => {
    return period.startDate <= new Date();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
        >
          <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-primary-800">Timeline</h1>
      </div>

      {/* Balance View Toggle */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-xl">
        {(['afterIncome', 'afterExpenses', 'afterBaseline'] as BalanceView[]).map((view) => (
          <button
            key={view}
            onClick={() => onBalanceViewChange(view)}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              balanceView === view
                ? 'bg-white text-primary-800 shadow-sm'
                : 'text-primary-500 hover:text-primary-700'
            }`}
          >
            {viewLabels[view]}
          </button>
        ))}
      </div>

      {/* Ledger Table */}
      <div className="card overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden md:grid grid-cols-[1fr_90px_90px_90px_80px] gap-2 px-4 py-3 bg-stone-50 border-b border-stone-200 text-[10px] font-semibold uppercase tracking-wider text-primary-400">
          <div>Period</div>
          <div className="text-right">After Pay</div>
          <div className="text-right">After Bills</div>
          <div className="text-right">After All</div>
          <div className="text-right">Details</div>
        </div>

        {/* Period Rows */}
        <div className="divide-y divide-stone-100">
          {projection.slice(0, 12).map((period) => {
            const status = getPeriodStatus(period);
            const historical = getHistoricalData(period.periodNumber);
            const periodTxns = adHocTransactions.filter(t => t.periodNumber === period.periodNumber);
            const isExpanded = expandedPeriods.has(period.periodNumber);
            const hasDetails = true; // Always has income, recurring, and baseline

            return (
              <div key={period.periodNumber}>
                {/* Main Period Row */}
                <div className={`grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_90px_90px_90px_80px] gap-2 px-4 py-3 items-center ${
                  status === 'active' ? 'bg-sage-50/50' : status === 'pending' ? 'bg-warning-50/50' : ''
                }`}>
                  {/* Period Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        status === 'active' ? 'bg-sage-500' :
                        status === 'pending' ? 'bg-warning-500' :
                        status === 'completed' ? 'bg-stone-400' : 'bg-stone-300'
                      }`} />
                      <span className="text-sm font-medium text-primary-800">
                        {status === 'active' ? 'Current' : `Period ${period.periodNumber}`}
                      </span>
                      {status === 'pending' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-warning-100 text-warning-700 rounded">
                          Confirm
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-primary-400 mt-0.5 pl-4">
                      {formatShortDate(period.startDate)} – {formatShortDate(period.date)}
                    </p>
                  </div>

                  {/* Mobile: Show selected balance */}
                  <div className="md:hidden text-right">
                    <p className="text-sm font-mono font-semibold tabular-nums text-primary-800">
                      {formatCurrency(getPrimaryBalance(period))}
                    </p>
                  </div>

                  {/* Mobile: Expand button */}
                  <button
                    onClick={() => toggleExpand(period.periodNumber)}
                    className="md:hidden w-8 h-8 flex items-center justify-center text-primary-400 hover:text-primary-600"
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  {/* Desktop: All three balances */}
                  <div className={`hidden md:block text-right font-mono text-sm tabular-nums ${
                    balanceView === 'afterIncome' ? 'font-semibold text-sage-700' : 'text-primary-500'
                  }`}>
                    {formatCurrency(period.balanceAfterIncome)}
                  </div>
                  <div className={`hidden md:block text-right font-mono text-sm tabular-nums ${
                    balanceView === 'afterExpenses' ? 'font-semibold text-warning-700' : 'text-primary-500'
                  }`}>
                    {formatCurrency(period.balanceAfterExpenses)}
                  </div>
                  <div className={`hidden md:block text-right font-mono text-sm tabular-nums ${
                    balanceView === 'afterBaseline' ? 'font-semibold text-primary-800' : 'text-primary-500'
                  }`}>
                    {formatCurrency(period.balanceAfterBaseline)}
                  </div>

                  {/* Desktop: Expand button */}
                  <div className="hidden md:flex justify-end">
                    <button
                      onClick={() => toggleExpand(period.periodNumber)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        isExpanded
                          ? 'text-primary-700 bg-primary-100'
                          : 'text-primary-500 hover:text-primary-700 hover:bg-stone-100'
                      }`}
                    >
                      {isExpanded ? 'Hide' : hasDetails ? 'Show' : 'Empty'}
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="bg-stone-50/80 border-t border-stone-200">
                    {/* Actions Row */}
                    <div className="px-4 py-2 flex gap-2 border-b border-stone-100">
                      {status === 'pending' && historical && (
                        <button
                          onClick={() => onConfirmPeriod(historical)}
                          className="px-3 py-1.5 text-xs font-medium text-warning-700 bg-warning-100 rounded-lg hover:bg-warning-200 transition-colors"
                        >
                          Confirm Balance
                        </button>
                      )}
                      <button
                        onClick={() => onAddTransaction(period.periodNumber)}
                        className="px-3 py-1.5 text-xs font-medium text-sage-700 bg-sage-100 rounded-lg hover:bg-sage-200 transition-colors"
                      >
                        + Add Transaction
                      </button>
                    </div>

                    {/* Running Balance Ledger */}
                    {(() => {
                      // Calculate starting balance (balance before any transactions this period)
                      const startingBalance = period.balanceAfterIncome - period.income - (period.adHocIncome ?? 0);
                      let runningBalance = startingBalance;

                      // Pre-calculate all running balances
                      const afterIncome = runningBalance + period.income;
                      runningBalance = afterIncome;

                      const expenseBalances: number[] = [];
                      period.expenseDetails.forEach((expense) => {
                        runningBalance -= expense.amount;
                        expenseBalances.push(runningBalance);
                      });

                      const afterBaseline = runningBalance - period.baselineSpend;

                      // Ad-hoc balances
                      let adHocRunning = afterBaseline;
                      const adHocBalances: number[] = [];
                      periodTxns.forEach((txn) => {
                        adHocRunning += txn.isIncome ? txn.amount : -txn.amount;
                        adHocBalances.push(adHocRunning);
                      });

                      const periodHasStarted = hasPeriodStarted(period);

                      // Helper to render editable balance
                      const renderEditableBalance = (
                        balance: number,
                        type: CheckpointType,
                        index?: number
                      ) => {
                        const isEditing = isEditingCheckpoint(period.periodNumber, type, index);

                        if (isEditing) {
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className="text-primary-400 text-xs">$</span>
                              <input
                                type="number"
                                value={checkpointInput}
                                onChange={(e) => setCheckpointInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCheckpoint(period, periodTxns);
                                  if (e.key === 'Escape') cancelCheckpointEdit();
                                }}
                                className="w-24 px-1.5 py-0.5 text-sm font-mono text-right border border-sage-300 rounded focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent bg-white"
                                step="0.01"
                                autoFocus
                              />
                              <button
                                onClick={() => saveCheckpoint(period, periodTxns)}
                                className="p-1 text-white bg-sage-600 rounded hover:bg-sage-700 transition-colors"
                                title="Save"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              </button>
                              <button
                                onClick={cancelCheckpointEdit}
                                className="p-1 text-primary-500 bg-stone-100 rounded hover:bg-stone-200 transition-colors"
                                title="Cancel"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-center gap-1.5 group/bal">
                            <span className="text-sm font-mono font-medium tabular-nums text-primary-800 min-w-[80px] text-right">
                              {formatCurrency(balance)}
                            </span>
                            {periodHasStarted && (
                              <button
                                onClick={() => startEditCheckpoint(period.periodNumber, type, balance, index)}
                                className="p-0.5 text-primary-300 hover:text-sage-600 hover:bg-sage-50 rounded transition-colors opacity-0 group-hover/bal:opacity-100"
                                title="Edit balance"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                </svg>
                              </button>
                            )}
                          </div>
                        );
                      };

                      return (
                        <div className="px-4 py-3">
                          {/* Starting Balance - Editable */}
                          <div className="flex items-center justify-between py-2 mb-2 border-b border-dashed border-stone-300">
                            <span className="text-xs font-medium text-primary-500">Starting Balance</span>
                            {isEditingCheckpoint(period.periodNumber, 'start') ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-primary-400 text-xs">$</span>
                                <input
                                  type="number"
                                  value={checkpointInput}
                                  onChange={(e) => setCheckpointInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveCheckpoint(period, periodTxns);
                                    if (e.key === 'Escape') cancelCheckpointEdit();
                                  }}
                                  className="w-28 px-2 py-1 text-sm font-mono text-right border border-sage-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent bg-white"
                                  step="0.01"
                                  autoFocus
                                />
                                <button
                                  onClick={() => saveCheckpoint(period, periodTxns)}
                                  className="p-1.5 text-white bg-sage-600 rounded-lg hover:bg-sage-700 transition-colors"
                                  title="Save"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                </button>
                                <button
                                  onClick={cancelCheckpointEdit}
                                  className="p-1.5 text-primary-500 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
                                  title="Cancel"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group">
                                <span className="text-sm font-mono font-semibold tabular-nums text-primary-700">
                                  {formatCurrency(startingBalance)}
                                </span>
                                {periodHasStarted && (
                                  <button
                                    onClick={() => startEditCheckpoint(period.periodNumber, 'start', startingBalance)}
                                    className="p-1 text-primary-300 hover:text-sage-600 hover:bg-sage-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                    title="Edit starting balance"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Income */}
                          <div className="mb-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-400 mb-1">
                              Income
                            </p>
                            <div className="border-l-2 border-sage-300 pl-3 ml-1">
                              <div className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-sage-500">↗</span>
                                  <span className="text-sm text-primary-700">Paycheck</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-mono tabular-nums text-sage-600">
                                    +{formatCurrency(period.income)}
                                  </span>
                                  <span className="text-xs text-primary-400">→</span>
                                  {renderEditableBalance(afterIncome, 'afterIncome')}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Recurring Bills */}
                          {period.expenseDetails.length > 0 && (
                            <div className="mb-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-400 mb-1">
                                Recurring Bills
                              </p>
                              <div className="space-y-0 border-l-2 border-warning-300 pl-3 ml-1">
                                {period.expenseDetails.map((expense, idx) => (
                                  <div key={`${expense.expenseId}-${idx}`} className="flex items-center justify-between py-1.5">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <span className="text-xs text-warning-500">↘</span>
                                      <span className="text-sm text-primary-700 truncate">{expense.name}</span>
                                      <span className="text-[10px] text-primary-400 flex-shrink-0">
                                        {formatShortDate(expense.date)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      <span className="text-sm font-mono tabular-nums text-warning-600">
                                        -{formatCurrency(expense.amount)}
                                      </span>
                                      <span className="text-xs text-primary-400">→</span>
                                      {renderEditableBalance(expenseBalances[idx], 'afterExpense', idx)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Baseline Spending */}
                          {period.baselineSpend > 0 && (
                            <div className="mb-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-400 mb-1">
                                Baseline Spending
                              </p>
                              <div className="border-l-2 border-primary-300 pl-3 ml-1">
                                <div className="flex items-center justify-between py-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-primary-400">↘</span>
                                    <span className="text-sm text-primary-700">Everyday expenses</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-mono tabular-nums text-primary-600">
                                      -{formatCurrency(period.baselineSpend)}
                                    </span>
                                    <span className="text-xs text-primary-400">→</span>
                                    {renderEditableBalance(afterBaseline, 'afterBaseline')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* One-Time Transactions */}
                          {periodTxns.length > 0 && (
                            <div className="mb-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-400 mb-1">
                                One-Time Transactions
                              </p>
                              <div className="space-y-0 border-l-2 border-stone-300 pl-3 ml-1">
                                {periodTxns.map((txn, idx) => (
                                  <div key={txn.id}>
                                    {editingTxnId === txn.id && editForm ? (
                                      /* Edit Mode */
                                      <div className="py-2 space-y-2 bg-white rounded-lg p-3 -ml-3 border border-stone-200">
                                        <input
                                          type="text"
                                          value={editForm.name}
                                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                          className="w-full px-2 py-1 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sage-500"
                                          placeholder="Name"
                                        />
                                        <div className="flex gap-2">
                                          <input
                                            type="number"
                                            value={editForm.amount}
                                            onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                            className="flex-1 px-2 py-1 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sage-500"
                                            placeholder="Amount"
                                            step="0.01"
                                          />
                                          <select
                                            value={editForm.isIncome ? 'income' : 'expense'}
                                            onChange={(e) => setEditForm({ ...editForm, isIncome: e.target.value === 'income' })}
                                            className="px-2 py-1 text-sm border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-sage-500 bg-white"
                                          >
                                            <option value="income">Income</option>
                                            <option value="expense">Expense</option>
                                          </select>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => saveEdit(txn)}
                                            className="flex-1 px-3 py-1 text-xs font-medium text-white bg-sage-600 rounded hover:bg-sage-700"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={cancelEdit}
                                            className="px-3 py-1 text-xs font-medium text-primary-600 bg-white border border-stone-300 rounded hover:bg-stone-50"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      /* Display Mode */
                                      <div className="flex items-center justify-between py-1.5 group relative">
                                        <div className="flex items-center gap-2">
                                          <span className={`text-xs ${txn.isIncome ? 'text-sage-500' : 'text-warning-500'}`}>
                                            {txn.isIncome ? '↗' : '↘'}
                                          </span>
                                          <span className="text-sm text-primary-700">{txn.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                          <span className={`text-sm font-mono tabular-nums ${txn.isIncome ? 'text-sage-600' : 'text-warning-600'}`}>
                                            {txn.isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                                          </span>
                                          <span className="text-xs text-primary-400">→</span>
                                          {renderEditableBalance(adHocBalances[idx], 'afterAdHoc', idx)}
                                        </div>
                                        {/* Edit/Delete buttons - absolutely positioned */}
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+4px)] flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-50 rounded px-1">
                                          <button
                                            onClick={() => startEdit(txn)}
                                            className="p-1 text-primary-400 hover:text-primary-600 hover:bg-stone-100 rounded"
                                            title="Edit"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => onDeleteTransaction(txn.id)}
                                            className="p-1 text-danger-400 hover:text-danger-600 hover:bg-danger-50 rounded"
                                            title="Delete"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Final Balance */}
                          <div className="flex items-center justify-between py-2 mt-2 border-t border-double border-stone-400 bg-stone-100/50 -mx-4 px-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">Period End Balance</span>
                            <span className="text-base font-mono font-bold tabular-nums text-primary-800">
                              {formatCurrency(period.balanceAfterBaseline)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}


                    {/* Historical Variance */}
                    {historical?.status === 'completed' && historical.variance !== undefined && historical.variance !== 0 && (
                      <div className="px-4 py-3 bg-stone-100/50 border-t border-stone-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-primary-600">
                            Actual Balance: <span className="font-mono font-medium">{formatCurrency(historical.endingBalance)}</span>
                          </span>
                          <span className={`font-mono font-medium ${historical.variance > 0 ? 'text-sage-600' : 'text-warning-600'}`}>
                            {historical.variance > 0 ? '+' : ''}{formatCurrency(historical.variance)} variance
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
