import type { HistoricalPeriod } from '../types';
import { formatCurrency, formatDate } from '../calculations';

interface PeriodHistoryViewProps {
  periods: HistoricalPeriod[];
  onBack: () => void;
}

const STATUS_BADGES = {
  completed: { label: 'Completed', className: 'bg-accent-100 text-accent-700' },
  'pending-confirmation': { label: 'Pending', className: 'bg-warning-100 text-warning-700' },
  active: { label: 'Active', className: 'bg-primary-100 text-primary-700' },
};

export function PeriodHistoryView({ periods, onBack }: PeriodHistoryViewProps) {
  // Sort by period number descending (most recent first)
  const sortedPeriods = [...periods].sort((a, b) => b.periodNumber - a.periodNumber);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-neutral-500 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-primary-800">Period History</h2>
      </div>

      {/* Period List */}
      {sortedPeriods.length === 0 ? (
        <div className="py-12 text-center text-neutral-500">
          <p className="mb-1">No period history yet</p>
          <p className="text-sm">Complete a pay period to start tracking history</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedPeriods.map((period) => (
            <div
              key={period.id}
              className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
            >
              {/* Period Header */}
              <div className="p-4 border-b border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-500">
                    Period {period.periodNumber}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGES[period.status].className}`}>
                    {STATUS_BADGES[period.status].label}
                  </span>
                </div>
                <p className="text-sm text-neutral-600">
                  {formatDate(new Date(period.startDate))} — {formatDate(new Date(period.endDate))}
                </p>
              </div>

              {/* Period Details */}
              <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-500 mb-1">Starting Balance</p>
                  <p className="font-medium text-neutral-800 tabular-nums">
                    {formatCurrency(period.startingBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 mb-1">Ending Balance</p>
                  <p className="font-medium text-neutral-800 tabular-nums">
                    {formatCurrency(period.endingBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 mb-1">Projected</p>
                  <p className="font-medium text-neutral-600 tabular-nums">
                    {formatCurrency(period.projectedEndingBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 mb-1">Variance</p>
                  <p className={`font-medium tabular-nums ${
                    period.variance > 0 ? 'text-danger-600' :
                    period.variance < 0 ? 'text-accent-600' : 'text-neutral-600'
                  }`}>
                    {period.variance > 0 ? '+' : ''}{formatCurrency(period.variance)}
                  </p>
                </div>
              </div>

              {/* Variance Explanations */}
              {period.varianceExplanations.length > 0 && (
                <div className="px-4 pb-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
                    Variance Breakdown
                  </p>
                  <div className="space-y-1">
                    {period.varianceExplanations.map((exp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm py-1"
                      >
                        <span className={`${exp.affectsBaseline ? 'text-warning-700' : 'text-neutral-600'}`}>
                          {exp.reason === 'adhoc_expense' && 'One-time expense'}
                          {exp.reason === 'planned_cost_higher' && 'Higher planned cost'}
                          {exp.reason === 'baseline_miss' && 'Baseline spending'}
                          {exp.description && `: ${exp.description}`}
                        </span>
                        <span className="font-medium tabular-nums text-neutral-700">
                          {formatCurrency(exp.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
