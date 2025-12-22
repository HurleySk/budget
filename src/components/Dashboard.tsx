import { useState } from 'react';
import type { BudgetConfig, ProjectionEntry, HistoricalPeriod, GoalProjection } from '../types';
import { formatCurrency } from '../calculations';
import { format } from 'date-fns';

type BalanceView = 'afterIncome' | 'afterExpenses' | 'afterBaseline';

interface DashboardProps {
  config: BudgetConfig;
  projection: ProjectionEntry[];
  goalDates: GoalProjection | null;
  calculatedBaseline: { average: number; count: number } | null;
  pendingPeriod: HistoricalPeriod | null;
  balanceView: BalanceView;
  onBalanceViewChange: (view: BalanceView) => void;
  onAddExpense: () => void;
  onConfirmPeriod: () => void;
  onViewTimeline: (periodNumber?: number) => void;
  onViewHistory: () => void;
  onUseCalculatedBaseline: () => void;
}

// Helper to format date compactly (e.g., "Dec 12")
function formatShortDate(date: Date): string {
  return format(date, 'MMM d');
}

// Helper to calculate weeks between dates
function weeksUntil(date: Date): number {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  return Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));
}

export function Dashboard({
  config,
  projection,
  goalDates,
  calculatedBaseline,
  pendingPeriod,
  balanceView,
  onBalanceViewChange,
  onAddExpense,
  onConfirmPeriod,
  onViewTimeline,
  onViewHistory,
  onUseCalculatedBaseline,
}: DashboardProps) {

  // Check if we have enough data for baseline suggestion (6+ periods)
  const showBaselineSuggestion = calculatedBaseline && calculatedBaseline.count >= 6;

  // Get first 4 periods for preview
  const previewPeriods = projection.slice(0, 4);

  // Get the primary balance based on view selection
  const getPrimaryBalance = (period: ProjectionEntry): number => {
    switch (balanceView) {
      case 'afterIncome': return period.balanceAfterIncome;
      case 'afterExpenses': return period.balanceAfterExpenses;
      case 'afterBaseline': return period.balanceAfterBaseline;
    }
  };

  // Get the goal date based on view selection
  const getSelectedGoalDate = (): Date | null => {
    if (!goalDates) return null;
    switch (balanceView) {
      case 'afterIncome': return goalDates.dateBeforeExpenses;
      case 'afterExpenses': return goalDates.dateAfterExpenses;
      case 'afterBaseline': return goalDates.dateAfterBaseline;
    }
  };

  const viewLabels: Record<BalanceView, { short: string; full: string; progressLabel: string }> = {
    afterIncome: { short: 'After Pay', full: 'After Paycheck', progressLabel: 'After paycheck' },
    afterExpenses: { short: 'After Bills', full: 'After Bills', progressLabel: 'After bills' },
    afterBaseline: { short: 'After All', full: 'After All Spending', progressLabel: 'After all spending' },
  };

  // Find the actual current period using date comparison (not hardcoded period 0)
  const getCurrentPeriod = (): ProjectionEntry | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const period of projection) {
      const start = new Date(period.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(period.date);
      end.setHours(0, 0, 0, 0);

      // Same logic as Timeline: today >= start && today < end
      if (today >= start && today < end) {
        return period;
      }
    }
    // Fallback to first period if none match
    return projection[0] ?? null;
  };

  const currentPeriod = getCurrentPeriod();

  // Get the relevant balance for current period based on selected view
  const currentPeriodBalance = currentPeriod ? getPrimaryBalance(currentPeriod) : config.currentBalance;

  // Get cumulative savings from current period only (not entire projection)
  const totalSaved = currentPeriod?.projectedCumulativeSavings ?? 0;
  const showSavingsTotal = config.autoSweepEnabled === true && totalSaved > 0;

  // Popover state for ahead/behind indicator
  const [showVariancePopover, setShowVariancePopover] = useState(false);

  // Calculate variance from completed periods (cumulative trend)
  const completedPeriods = (config.periods ?? []).filter(p => p.status === 'completed');
  const cumulativeVariance = completedPeriods.length > 0
    ? completedPeriods.reduce((sum, p) => sum + (p.variance ?? 0), 0) / completedPeriods.length
    : null;

  // Current period variance: compare previous period's actual ending to what was projected
  const previousPeriod = completedPeriods.length > 0
    ? completedPeriods[completedPeriods.length - 1]
    : null;
  // Use the historical period's stored values for accurate comparison
  const currentPeriodVariance = previousPeriod
    ? previousPeriod.endingBalance - previousPeriod.projectedEndingBalance
    : null;

  // Determine if user is ahead, behind, or on track (within $25 threshold)
  const getVarianceStatus = (variance: number | null): 'ahead' | 'behind' | 'ontrack' | null => {
    if (variance === null) return null;
    if (variance > 25) return 'ahead';
    if (variance < -25) return 'behind';
    return 'ontrack';
  };

  const varianceStatus = getVarianceStatus(currentPeriodVariance ?? cumulativeVariance);
  const displayVariance = currentPeriodVariance ?? cumulativeVariance;

  // Calculate progress percentage based on selected scenario's balance vs goal
  const progressPercent = config.savingsGoal > 0
    ? Math.min(100, Math.max(0, (currentPeriodBalance / config.savingsGoal) * 100))
    : 0;

  const selectedGoalDate = getSelectedGoalDate();

  return (
    <div className="space-y-4">
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
            {viewLabels[view].short}
          </button>
        ))}
      </div>

      {/* Goal Progress Card */}
      <div className="card p-5">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-500">
            Goal Progress
          </span>
          {config.savingsGoal > 0 && (
            <span className="text-xs text-primary-400">
              {progressPercent.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Balances */}
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="text-2xl font-mono font-medium text-primary-800 tabular-nums">
              {formatCurrency(currentPeriodBalance)}
            </p>
            <p className="text-xs text-primary-400 mt-0.5">{viewLabels[balanceView].progressLabel}</p>
          </div>
          {config.savingsGoal > 0 && (
            <div className="text-right">
              <p className="text-lg font-mono font-medium text-primary-600 tabular-nums">
                {formatCurrency(config.savingsGoal)}
              </p>
              <p className="text-xs text-primary-400 mt-0.5">Goal</p>
            </div>
          )}
        </div>

        {/* Ahead/Behind Indicator */}
        {varianceStatus && displayVariance !== null && (
          <div className="relative mb-4">
            <button
              onClick={() => setShowVariancePopover(!showVariancePopover)}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                varianceStatus === 'ahead' ? 'text-sage-600 hover:text-sage-700' :
                varianceStatus === 'behind' ? 'text-warning-600 hover:text-warning-700' :
                'text-primary-400 hover:text-primary-500'
              }`}
            >
              <span>
                {varianceStatus === 'ahead' ? '↗' : varianceStatus === 'behind' ? '↘' : '→'}
              </span>
              <span className="font-medium">
                {varianceStatus === 'ontrack' ? 'On track' :
                  `${formatCurrency(Math.abs(displayVariance))} ${varianceStatus}`}
              </span>
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Popover */}
            {showVariancePopover && (
              <div className="absolute left-0 top-full mt-2 z-10 w-64 p-3 bg-stone-50 border border-stone-200 rounded-xl shadow-lg popover">
                <button
                  onClick={() => setShowVariancePopover(false)}
                  className="absolute top-2 right-2 text-primary-400 hover:text-primary-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {currentPeriodVariance !== null && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-400 mb-1">
                      This Period
                    </p>
                    <p className="text-sm text-primary-700">
                      Started with{' '}
                      <span className={`font-medium ${currentPeriodVariance >= 0 ? 'text-sage-600' : 'text-warning-600'}`}>
                        {formatCurrency(Math.abs(currentPeriodVariance))} {currentPeriodVariance >= 0 ? 'more' : 'less'}
                      </span>
                      {' '}than projected
                    </p>
                  </div>
                )}

                {completedPeriods.length >= 2 && cumulativeVariance !== null && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-400 mb-1">
                      Overall Trend ({completedPeriods.length} periods)
                    </p>
                    <p className="text-sm text-primary-700">
                      Averaging{' '}
                      <span className={`font-medium ${cumulativeVariance >= 0 ? 'text-sage-600' : 'text-warning-600'}`}>
                        {formatCurrency(Math.abs(cumulativeVariance))} {cumulativeVariance >= 0 ? 'ahead' : 'behind'}
                      </span>
                      {' '}per period
                    </p>
                  </div>
                )}

                {completedPeriods.length === 0 && currentPeriodVariance === null && (
                  <p className="text-sm text-primary-500">
                    Complete a pay period to see variance tracking.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {config.savingsGoal > 0 && (
          <div className="h-2 bg-stone-200 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-sage-500 rounded-full transition-all duration-500 progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Total Saved - only show if auto-sweep enabled and has savings */}
        {showSavingsTotal && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-sage-500">↗</span>
            <span className="text-sm text-sage-600">
              Saved so far: <span className="font-mono font-medium">{formatCurrency(totalSaved)}</span>
            </span>
          </div>
        )}

        {/* Goal Date - Based on Selected View */}
        {config.savingsGoal > 0 && goalDates && (
          <div className="border-t border-stone-200 pt-4 mt-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-500 mb-3">
              When You'll Reach Your Goal
            </p>

            {/* Primary: Selected view */}
            <div className="p-3 bg-stone-50 rounded-xl mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-800">
                    {viewLabels[balanceView].full}
                  </p>
                  <p className="text-xs text-primary-500">
                    {balanceView === 'afterIncome' ? 'Best case scenario' :
                     balanceView === 'afterExpenses' ? 'After recurring bills' :
                     'Most conservative estimate'}
                  </p>
                </div>
                {selectedGoalDate ? (
                  <div className="text-right">
                    <p className="text-lg font-mono font-semibold tabular-nums text-primary-800">
                      {formatShortDate(selectedGoalDate)}
                    </p>
                    <p className="text-xs text-primary-500">
                      {weeksUntil(selectedGoalDate)} weeks
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-warning-600">Beyond projection</p>
                )}
              </div>
            </div>

            {/* Secondary: Other views (compact) */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(['afterIncome', 'afterExpenses', 'afterBaseline'] as BalanceView[])
                .filter(v => v !== balanceView)
                .map((view) => {
                  const date = view === 'afterIncome' ? goalDates.dateBeforeExpenses :
                               view === 'afterExpenses' ? goalDates.dateAfterExpenses :
                               goalDates.dateAfterBaseline;
                  return (
                    <button
                      key={view}
                      onClick={() => onBalanceViewChange(view)}
                      className="p-2 rounded-lg bg-white border border-stone-200 hover:border-stone-300 transition-colors text-left"
                    >
                      <p className="text-primary-500 mb-1">{viewLabels[view].short}</p>
                      <p className="font-mono tabular-nums text-primary-700">
                        {date ? formatShortDate(date) : '—'}
                      </p>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* No goal set */}
        {config.savingsGoal <= 0 && (
          <p className="text-sm text-primary-400 text-center py-4">
            Set a savings goal in Settings to track progress
          </p>
        )}
      </div>

      {/* Upcoming Periods Preview - Grid Layout */}
      {previewPeriods.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-500">
              Upcoming Periods
            </span>
            <button
              onClick={() => onViewTimeline()}
              className="text-xs font-medium text-sage-600 hover:text-sage-700"
            >
              See all →
            </button>
          </div>

          {/* Grid layout - fills the row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {previewPeriods.map((period) => {
              const hasAdHocIncome = (period.adHocIncome ?? 0) > 0;
              const hasAdHocExpenses = (period.adHocExpenses ?? 0) > 0;
              const hasSwept = config.autoSweepEnabled && (period.projectedSweep ?? 0) > 0;

              return (
                <button
                  key={period.periodNumber}
                  onClick={() => onViewTimeline(period.periodNumber)}
                  className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-left hover:border-sage-300 hover:bg-stone-100/50 transition-colors cursor-pointer"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary-500">
                      {currentPeriod && period.periodNumber === currentPeriod.periodNumber ? 'Now' : `P${period.periodNumber}`}
                    </span>
                    {currentPeriod && period.periodNumber === currentPeriod.periodNumber && (
                      <span className="px-1.5 py-0.5 bg-sage-100 text-sage-700 text-[10px] font-medium rounded-full">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Date range */}
                  <p className="text-[11px] text-primary-400 mb-3">
                    {formatShortDate(period.startDate)} – {formatShortDate(period.date)}
                  </p>

                  {/* Financial breakdown with ad-hoc separated */}
                  <div className="space-y-1 text-[11px]">
                    {/* Income */}
                    <div className="flex justify-between">
                      <span className="text-primary-400">Income</span>
                      <span className="font-mono tabular-nums text-sage-600">
                        +{formatCurrency(period.income)}
                      </span>
                    </div>
                    {/* Ad-hoc income */}
                    {hasAdHocIncome && (
                      <div className="flex justify-between pl-2">
                        <span className="text-primary-400">+ Extra</span>
                        <span className="font-mono tabular-nums text-sage-500">
                          +{formatCurrency(period.adHocIncome ?? 0)}
                        </span>
                      </div>
                    )}
                    {/* Bills */}
                    <div className="flex justify-between">
                      <span className="text-primary-400">Bills</span>
                      <span className="font-mono tabular-nums text-warning-600">
                        -{formatCurrency(period.expenses)}
                      </span>
                    </div>
                    {/* Ad-hoc expenses */}
                    {hasAdHocExpenses && (
                      <div className="flex justify-between pl-2">
                        <span className="text-primary-400">- Extra</span>
                        <span className="font-mono tabular-nums text-warning-500">
                          -{formatCurrency(period.adHocExpenses ?? 0)}
                        </span>
                      </div>
                    )}
                    {/* Baseline */}
                    <div className="flex justify-between">
                      <span className="text-primary-400">Baseline</span>
                      <span className="font-mono tabular-nums text-primary-500">
                        -{formatCurrency(period.baselineSpend)}
                      </span>
                    </div>
                    {/* Swept to savings */}
                    {hasSwept && (
                      <div className="flex justify-between">
                        <span className="text-sage-500">↗ Swept</span>
                        <span className="font-mono tabular-nums text-sage-600 font-medium">
                          {formatCurrency(period.projectedSweep)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ending balance - based on selected view */}
                  <div className="mt-2 pt-2 border-t border-stone-200">
                    <p className="text-xs font-mono font-medium tabular-nums text-primary-800">
                      {formatCurrency(getPrimaryBalance(period))}
                    </p>
                    <p className="text-[10px] text-primary-400">{viewLabels[balanceView].short}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Action - Add Expense */}
      <button
        onClick={onAddExpense}
        className="card p-4 w-full flex items-center justify-center gap-3 hover:border-sage-300 transition-colors group"
      >
        <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center group-hover:bg-sage-200 transition-colors">
          <svg className="w-5 h-5 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <div className="text-left">
          <p className="font-medium text-primary-800">Add Expense</p>
          <p className="text-xs text-primary-500">Log a one-time transaction</p>
        </div>
      </button>

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

      {/* Baseline Suggestion Alert */}
      {showBaselineSuggestion && calculatedBaseline && calculatedBaseline.average !== config.baselineSpendPerPeriod && (
        <div className="card p-4 border-sage-200 bg-sage-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-200 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-sage-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sage-800">Baseline Update Available</p>
              <p className="text-sm text-sage-600">
                Your average: {formatCurrency(calculatedBaseline.average)}/period
              </p>
            </div>
            <button
              onClick={onUseCalculatedBaseline}
              className="px-3 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 transition-colors flex-shrink-0"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => onViewTimeline()}
          className="w-full py-3 flex items-center justify-center gap-2 text-primary-500 hover:text-primary-600 transition-colors"
        >
          <span className="text-sm font-medium">View Full Timeline</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
        {(config.periods ?? []).filter(p => p.status === 'completed').length > 0 && (
          <button
            onClick={onViewHistory}
            className="w-full py-2 flex items-center justify-center gap-2 text-primary-400 hover:text-primary-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">Period History</span>
          </button>
        )}
      </div>
    </div>
  );
}
