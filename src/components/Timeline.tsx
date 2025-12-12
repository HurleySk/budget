import { useState } from 'react';
import type { ProjectionEntry, HistoricalPeriod, AdHocTransaction } from '../types';
import { formatCurrency, formatDate } from '../calculations';

interface TimelineProps {
  projection: ProjectionEntry[];
  historicalPeriods: HistoricalPeriod[];
  adHocTransactions: AdHocTransaction[];
  onAddTransaction: (periodNumber: number) => void;
  onConfirmPeriod: (period: HistoricalPeriod) => void;
  onBack: () => void;
}

export function Timeline({
  projection,
  historicalPeriods,
  adHocTransactions,
  onAddTransaction,
  onConfirmPeriod,
  onBack,
}: TimelineProps) {
  const [expandedPeriods, setExpandedPeriods] = useState<Set<number>>(() => {
    // Auto-expand current period (0) and any pending confirmation
    const expanded = new Set<number>([0]);
    const pending = historicalPeriods.find(p => p.status === 'pending-confirmation');
    if (pending) expanded.add(pending.periodNumber);
    return expanded;
  });

  const togglePeriod = (periodNumber: number) => {
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

  // Get status for a period
  const getPeriodStatus = (periodNumber: number): 'active' | 'pending' | 'completed' | 'future' => {
    if (periodNumber === 0) return 'active';
    const historical = historicalPeriods.find(p => p.periodNumber === periodNumber);
    if (historical?.status === 'pending-confirmation') return 'pending';
    if (historical?.status === 'completed') return 'completed';
    return 'future';
  };

  // Get historical data for a period
  const getHistoricalData = (periodNumber: number) => {
    return historicalPeriods.find(p => p.periodNumber === periodNumber);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
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

      {/* Period Cards */}
      {projection.slice(0, 12).map((period) => {
        const status = getPeriodStatus(period.periodNumber);
        const isExpanded = expandedPeriods.has(period.periodNumber);
        const historical = getHistoricalData(period.periodNumber);
        const periodTxns = adHocTransactions.filter(t => t.periodNumber === period.periodNumber);

        return (
          <PeriodCard
            key={period.periodNumber}
            period={period}
            status={status}
            isExpanded={isExpanded}
            historical={historical}
            transactions={periodTxns}
            onToggle={() => togglePeriod(period.periodNumber)}
            onAddTransaction={() => onAddTransaction(period.periodNumber)}
            onConfirm={historical ? () => onConfirmPeriod(historical) : undefined}
          />
        );
      })}
    </div>
  );
}

interface PeriodCardProps {
  period: ProjectionEntry;
  status: 'active' | 'pending' | 'completed' | 'future';
  isExpanded: boolean;
  historical?: HistoricalPeriod;
  transactions: AdHocTransaction[];
  onToggle: () => void;
  onAddTransaction: () => void;
  onConfirm?: () => void;
}

function PeriodCard({
  period,
  status,
  isExpanded,
  historical,
  transactions,
  onToggle,
  onAddTransaction,
  onConfirm,
}: PeriodCardProps) {
  const statusStyles = {
    active: 'border-sage-300 bg-sage-50/50',
    pending: 'border-warning-300 bg-warning-50/50',
    completed: 'border-stone-200 bg-white',
    future: 'border-stone-200 bg-white',
  };

  const statusBadge = {
    active: { text: 'Active', className: 'bg-sage-100 text-sage-700' },
    pending: { text: 'Confirm', className: 'bg-warning-100 text-warning-700' },
    completed: { text: 'Complete', className: 'bg-stone-100 text-stone-600' },
    future: { text: 'Upcoming', className: 'bg-stone-100 text-stone-500' },
  };

  // Use actual period start date from projection
  const periodStartDate = period.startDate;

  return (
    <div className={`card overflow-hidden ${statusStyles[status]}`}>
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-500">
              Period {period.periodNumber}
            </span>
            {period.periodNumber === 0 && (
              <span className="text-xs text-primary-400">(Current)</span>
            )}
          </div>
          <p className="text-sm text-primary-600">
            {formatDate(periodStartDate)} – {formatDate(period.date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge[status].className}`}>
            {statusBadge[status].text}
          </span>
          <svg
            className={`w-5 h-5 text-primary-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-stone-200">
          <div className="pt-4 space-y-3">
            {/* Financial Breakdown */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="text-primary-500">Starting</div>
              <div className="text-right font-mono tabular-nums text-primary-700">
                {formatCurrency(period.balanceAfterIncome - period.income)}
              </div>

              <div className="text-primary-500">Income</div>
              <div className="text-right font-mono tabular-nums text-sage-600">
                +{formatCurrency(period.income)}
              </div>

              <div className="text-primary-500">Bills</div>
              <div className="text-right font-mono tabular-nums text-warning-600">
                -{formatCurrency(period.expenses)}
              </div>

              <div className="text-primary-500">Baseline</div>
              <div className="text-right font-mono tabular-nums text-warning-600">
                -{formatCurrency(period.baselineSpend)}
              </div>

              <div className="col-span-2 border-t border-stone-200 my-1"></div>

              <div className="text-primary-700 font-medium">Projected</div>
              <div className="text-right font-mono tabular-nums text-primary-800 font-semibold">
                {formatCurrency(period.balanceAfterBaseline)}
              </div>
            </div>

            {/* Ad-hoc Transactions */}
            {transactions.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium text-primary-500 uppercase tracking-wider mb-2">
                  Ad-hoc
                </p>
                <div className="space-y-1">
                  {transactions.map(txn => (
                    <div key={txn.id} className="flex justify-between text-sm">
                      <span className="text-primary-600">{txn.name}</span>
                      <span className={`font-mono tabular-nums ${txn.isIncome ? 'text-sage-600' : 'text-warning-600'}`}>
                        {txn.isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historical Variance */}
            {historical?.status === 'completed' && historical.variance !== 0 && (
              <div className="pt-2 p-3 bg-stone-50 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-primary-600">Actual</span>
                  <span className="font-mono tabular-nums text-primary-800">
                    {formatCurrency(historical.endingBalance)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-primary-500">Variance</span>
                  <span className={`font-mono tabular-nums ${historical.variance > 0 ? 'text-sage-600' : 'text-warning-600'}`}>
                    {historical.variance > 0 ? '+' : ''}{formatCurrency(historical.variance)}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex gap-2">
              {status === 'pending' && onConfirm && (
                <button
                  onClick={onConfirm}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-warning-600 rounded-xl hover:bg-warning-700 transition-colors"
                >
                  Confirm actual balance
                </button>
              )}

              {(status === 'active' || status === 'pending') && (
                <button
                  onClick={onAddTransaction}
                  className={`px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                    status === 'pending'
                      ? 'text-sage-700 bg-sage-100 hover:bg-sage-200'
                      : 'flex-1 text-white bg-sage-600 hover:bg-sage-700'
                  }`}
                >
                  + Add transaction
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
