import { useMemo } from 'react';
import type { BudgetConfig, ProjectionEntry, HistoricalPeriod } from '../types';
import { formatCurrency, formatDate } from '../calculations';

interface DashboardProps {
  config: BudgetConfig;
  projection: ProjectionEntry[];
  calculatedBaseline: { average: number; count: number } | null;
  pendingPeriod: HistoricalPeriod | null;
  onAddExpense: () => void;
  onUpdateBalance: () => void;
  onConfirmPeriod: () => void;
  onViewTimeline: () => void;
  onUseCalculatedBaseline: () => void;
}

export function Dashboard({
  config,
  projection,
  calculatedBaseline,
  pendingPeriod,
  onAddExpense,
  onUpdateBalance,
  onConfirmPeriod,
  onViewTimeline,
  onUseCalculatedBaseline,
}: DashboardProps) {
  // Calculate projection summary
  const projectionSummary = useMemo(() => {
    if (projection.length === 0) return null;

    // Find when goal is reached (or last projection date)
    const goalAmount = config.savingsGoal;
    let targetDate: Date | null = null;
    let targetBalance = 0;

    if (goalAmount > 0) {
      const goalPeriod = projection.find(p => p.balanceAfterBaseline >= goalAmount);
      if (goalPeriod) {
        targetDate = goalPeriod.date;
        targetBalance = goalAmount;
      }
    }

    // If no goal or goal not reachable, show last projection
    if (!targetDate && projection.length > 0) {
      const lastPeriod = projection[projection.length - 1];
      targetDate = lastPeriod.date;
      targetBalance = lastPeriod.balanceAfterBaseline;
    }

    return { targetDate, targetBalance };
  }, [projection, config.savingsGoal]);

  // Calculate weeks to goal
  const weeksToGoal = useMemo(() => {
    if (!projectionSummary?.targetDate) return null;
    const now = new Date();
    const diffMs = projectionSummary.targetDate.getTime() - now.getTime();
    const weeks = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));
    return weeks > 0 ? weeks : null;
  }, [projectionSummary]);

  // Check if we have enough data for baseline suggestion (3+ months ≈ 6+ biweekly periods)
  const showBaselineSuggestion = calculatedBaseline && calculatedBaseline.count >= 6;

  return (
    <div className="space-y-6">
      {/* Projection Hero */}
      <div className="card p-6 text-center">
        <p className="text-sm font-medium text-primary-600 mb-2">
          Projected balance
        </p>
        <p className="text-4xl font-mono font-medium text-primary-800 tabular-nums mb-1">
          {projectionSummary ? formatCurrency(projectionSummary.targetBalance) : '$0'}
        </p>
        {projectionSummary?.targetDate && (
          <p className="text-sm text-primary-500">
            by {formatDate(projectionSummary.targetDate)}
            {weeksToGoal && ` (~${weeksToGoal} weeks)`}
          </p>
        )}

        {/* Mini sparkline placeholder - can enhance later */}
        <div className="mt-4 h-12 bg-stone-100 rounded-lg flex items-center justify-center">
          <span className="text-xs text-stone-400">Projection trend</span>
        </div>

        {/* Baseline info */}
        <div className="mt-4 pt-4 border-t border-stone-200">
          <p className="text-sm text-primary-600">
            Baseline: <span className="font-medium tabular-nums">{formatCurrency(config.baselineSpendPerPeriod)}</span>/period
          </p>
          {showBaselineSuggestion && calculatedBaseline.average !== config.baselineSpendPerPeriod && (
            <p className="text-xs text-sage-600 mt-1">
              Avg actual: {formatCurrency(calculatedBaseline.average)} ·{' '}
              <button
                onClick={onUseCalculatedBaseline}
                className="underline hover:text-sage-700"
              >
                Use this?
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onAddExpense}
          className="card p-4 text-left hover:border-sage-300 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center mb-3 group-hover:bg-sage-100 transition-colors">
            <svg className="w-5 h-5 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <p className="font-medium text-primary-800">Add Expense</p>
          <p className="text-xs text-primary-500 mt-0.5">Log a transaction</p>
        </button>

        <button
          onClick={onUpdateBalance}
          className="card p-4 text-left hover:border-sage-300 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mb-3 group-hover:bg-primary-100 transition-colors">
            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </div>
          <p className="font-medium text-primary-800">Update Balance</p>
          <p className="text-xs text-primary-500 mt-0.5">Sync with your bank</p>
        </button>
      </div>

      {/* Pending Confirmation Alert */}
      {pendingPeriod && (
        <button
          onClick={onConfirmPeriod}
          className="card p-4 w-full text-left border-warning-200 bg-warning-50 hover:bg-warning-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning-200 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-warning-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-warning-800">
                Period {pendingPeriod.periodNumber} needs confirmation
              </p>
              <p className="text-sm text-warning-600 truncate">
                {pendingPeriod.startDate} – {pendingPeriod.endDate}
              </p>
            </div>
            <svg className="w-5 h-5 text-warning-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </button>
      )}

      {/* View Timeline Link */}
      <button
        onClick={onViewTimeline}
        className="card p-4 w-full text-left hover:border-primary-300 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors">
              <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-primary-800">View Timeline</p>
              <p className="text-xs text-primary-500">See all pay periods</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </button>
    </div>
  );
}
