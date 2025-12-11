import type { HistoricalPeriod } from '../types';
import { formatCurrency } from '../calculations';

interface PeriodHistorySummaryProps {
  periods: HistoricalPeriod[];
  budgetStartDate?: string;
  onViewHistory: () => void;
}

export function PeriodHistorySummary({
  periods,
  budgetStartDate,
  onViewHistory,
}: PeriodHistorySummaryProps) {
  const completedPeriods = periods.filter((p) => p.status === 'completed');

  if (completedPeriods.length === 0 && !budgetStartDate) {
    return null;
  }

  // Calculate average baseline from periods where variance affected baseline
  const baselineEntries = completedPeriods.flatMap((p) =>
    p.varianceExplanations
      .filter((v) => v.affectsBaseline)
      .map((v) => v.amount)
  );

  const avgBaseline = baselineEntries.length > 0
    ? baselineEntries.reduce((a, b) => a + b, 0) / baselineEntries.length
    : null;

  const startDateFormatted = budgetStartDate
    ? new Date(budgetStartDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl border border-primary-100">
      <div className="flex items-center gap-4 text-sm">
        {startDateFormatted && (
          <span className="text-primary-700">
            Tracking since <span className="font-medium">{startDateFormatted}</span>
          </span>
        )}
        {completedPeriods.length > 0 && (
          <>
            <span className="text-neutral-300">|</span>
            <span className="text-primary-700">
              <span className="font-medium">{completedPeriods.length}</span> periods
            </span>
          </>
        )}
        {avgBaseline !== null && (
          <>
            <span className="text-neutral-300">|</span>
            <span className="text-primary-700">
              Avg spend: <span className="font-medium tabular-nums">{formatCurrency(avgBaseline)}</span>
            </span>
          </>
        )}
      </div>
      <button
        onClick={onViewHistory}
        className="text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors"
      >
        View History
      </button>
    </div>
  );
}
