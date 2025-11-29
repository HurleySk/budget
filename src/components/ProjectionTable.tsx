import { format } from 'date-fns';
import type { ProjectionEntry } from '../types';
import { formatCurrency } from '../calculations';

interface ProjectionTableProps {
  data: ProjectionEntry[];
  savingsGoal: number;
  onSelectPeriod: (periodNumber: number) => void;
}

export function ProjectionTable({ data, savingsGoal, onSelectPeriod }: ProjectionTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200/60 shadow-sm p-8 text-center">
        <svg className="w-12 h-12 mx-auto text-neutral-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-neutral-500">Enter your budget details to see projections</p>
      </div>
    );
  }

  // Find the first period where goal is reached
  const goalReachedPeriod = data.find(
    (entry) => entry.balanceAfterBaseline >= savingsGoal
  )?.periodNumber;

  return (
    <div className="bg-white rounded-xl border border-neutral-200/60 shadow-sm overflow-hidden">
      <div className="px-4 py-3 md:px-5 md:py-4 border-b border-neutral-200">
        <h3 className="text-base font-semibold text-primary-800">
          Projection Details
        </h3>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-neutral-100">
        {data.map((entry) => (
          <ProjectionCard
            key={entry.periodNumber}
            entry={entry}
            isGoalReached={goalReachedPeriod === entry.periodNumber && savingsGoal > 0}
            onSelect={() => onSelectPeriod(entry.periodNumber)}
          />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-accent-600">
                Income
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-danger-600">
                Expenses
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-warning-600">
                Baseline
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-primary-600">
                After Income
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-warning-600">
                After Expenses
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-primary-800">
                After Baseline
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.map((entry) => {
              const isGoalReached =
                goalReachedPeriod === entry.periodNumber && savingsGoal > 0;
              const rowClass = isGoalReached
                ? 'bg-accent-50/50'
                : entry.balanceAfterBaseline < 0
                ? 'bg-danger-50/50'
                : '';

              const hasAdHoc = (entry.adHocDetails ?? []).length > 0;

              return (
                <tr
                  key={entry.periodNumber}
                  className={`${rowClass} cursor-pointer hover:bg-primary-50/50 transition-colors duration-150`}
                  onClick={() => onSelectPeriod(entry.periodNumber)}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-500">
                    {entry.periodNumber}
                    {isGoalReached && (
                      <span className="ml-2 text-accent-500">★</span>
                    )}
                    {hasAdHoc && (
                      <span className="ml-1 text-primary-400" title="Has one-time transactions">●</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-800">
                    {format(entry.date, 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-accent-600 tabular-nums">
                    +{formatCurrency(entry.income + (entry.adHocIncome ?? 0))}
                    {(entry.adHocIncome ?? 0) > 0 && (
                      <span className="text-primary-400 ml-1 text-xs">*</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-danger-600 tabular-nums">
                    <span
                      className={entry.expenseDetails.length > 0 ? 'cursor-help' : ''}
                      title={
                        entry.expenseDetails.length > 0
                          ? entry.expenseDetails
                              .map((e) => `${e.name}: ${formatCurrency(e.amount)} (${format(e.date, 'MMM d')})`)
                              .join('\n')
                          : undefined
                      }
                    >
                      -{formatCurrency(entry.expenses + (entry.adHocExpenses ?? 0))}
                      {(entry.expenseDetails.length > 0 || (entry.adHocExpenses ?? 0) > 0) && (
                        <span className="text-neutral-400 ml-1 text-xs">
                          ({entry.expenseDetails.length}{(entry.adHocExpenses ?? 0) > 0 ? '*' : ''})
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-warning-600 tabular-nums">
                    -{formatCurrency(entry.baselineSpend)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-primary-600 tabular-nums">
                    {formatCurrency(entry.balanceAfterIncome)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-warning-600 tabular-nums">
                    {formatCurrency(entry.balanceAfterExpenses)}
                  </td>
                  <td
                    className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold tabular-nums ${
                      entry.balanceAfterBaseline < 0
                        ? 'text-danger-600'
                        : 'text-primary-800'
                    }`}
                  >
                    {formatCurrency(entry.balanceAfterBaseline)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Goal reached footer */}
      {savingsGoal > 0 && goalReachedPeriod && (
        <div className="px-4 py-3 bg-accent-50 border-t border-accent-200">
          <p className="text-sm font-medium text-accent-700">
            ★ Goal of {formatCurrency(savingsGoal)} reached in period{' '}
            {goalReachedPeriod}
          </p>
        </div>
      )}
    </div>
  );
}

// Mobile card component for each projection entry
interface ProjectionCardProps {
  entry: ProjectionEntry;
  isGoalReached: boolean;
  onSelect: () => void;
}

function ProjectionCard({ entry, isGoalReached, onSelect }: ProjectionCardProps) {
  const hasAdHoc = (entry.adHocDetails ?? []).length > 0;
  const isNegative = entry.balanceAfterBaseline < 0;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 min-h-[88px] transition-colors duration-150 active:bg-neutral-100
        ${isGoalReached ? 'bg-accent-50/50' : isNegative ? 'bg-danger-50/50' : ''}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
            {entry.periodNumber}
          </span>
          {isGoalReached && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-500 text-white">
              ★ Goal
            </span>
          )}
          {hasAdHoc && (
            <span className="text-primary-400 text-xs">● has extras</span>
          )}
        </div>
        <span className="text-sm font-medium text-neutral-700">
          {format(entry.date, 'MMM d, yyyy')}
        </span>
      </div>

      {/* Balance row - most important info prominent */}
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-neutral-500">After Baseline</span>
        <span className={`text-xl font-bold tabular-nums ${isNegative ? 'text-danger-600' : 'text-primary-800'}`}>
          {formatCurrency(entry.balanceAfterBaseline)}
        </span>
      </div>

      {/* Summary row */}
      <div className="flex justify-between text-xs">
        <span className="text-accent-600">
          +{formatCurrency(entry.income + (entry.adHocIncome ?? 0))} income
        </span>
        <span className="text-danger-500">
          -{formatCurrency(entry.expenses + (entry.adHocExpenses ?? 0) + entry.baselineSpend)} out
        </span>
      </div>

      {/* Chevron indicator */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-300">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
