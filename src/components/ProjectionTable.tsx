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
      <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
        Enter your budget details to see projections
      </div>
    );
  }

  // Find the first period where goal is reached
  const goalReachedPeriod = data.find(
    (entry) => entry.balanceAfterBaseline >= savingsGoal
  )?.periodNumber;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Projection Details
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Income
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expenses
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Baseline
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-blue-600 uppercase tracking-wider">
                After Income
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-amber-600 uppercase tracking-wider">
                After Expenses
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-purple-600 uppercase tracking-wider">
                After Baseline
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((entry) => {
              const isGoalReached =
                goalReachedPeriod === entry.periodNumber && savingsGoal > 0;
              const rowClass = isGoalReached
                ? 'bg-green-50'
                : entry.balanceAfterBaseline < 0
                ? 'bg-red-50'
                : '';

              const hasAdHoc = (entry.adHocDetails ?? []).length > 0;

              return (
                <tr
                  key={entry.periodNumber}
                  className={`${rowClass} cursor-pointer hover:bg-gray-100 transition-colors`}
                  onClick={() => onSelectPeriod(entry.periodNumber)}
                >
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {entry.periodNumber}
                    {isGoalReached && (
                      <span className="ml-2 text-green-600">★</span>
                    )}
                    {hasAdHoc && (
                      <span className="ml-1 text-blue-500" title="Has one-time transactions">●</span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {format(entry.date, 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-green-600">
                    +{formatCurrency(entry.income + (entry.adHocIncome ?? 0))}
                    {(entry.adHocIncome ?? 0) > 0 && (
                      <span className="text-blue-500 ml-1 text-xs">*</span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-red-600">
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
                        <span className="text-gray-400 ml-1 text-xs">
                          ({entry.expenseDetails.length}{(entry.adHocExpenses ?? 0) > 0 ? '*' : ''})
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-orange-600">
                    -{formatCurrency(entry.baselineSpend)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                    {formatCurrency(entry.balanceAfterIncome)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-amber-600">
                    {formatCurrency(entry.balanceAfterExpenses)}
                  </td>
                  <td
                    className={`px-4 py-2 whitespace-nowrap text-sm text-right font-medium ${
                      entry.balanceAfterBaseline < 0
                        ? 'text-red-600'
                        : 'text-purple-600'
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
      {savingsGoal > 0 && goalReachedPeriod && (
        <div className="px-4 py-3 bg-green-50 border-t border-green-200">
          <p className="text-sm text-green-700">
            ★ Goal of {formatCurrency(savingsGoal)} reached in period{' '}
            {goalReachedPeriod}
          </p>
        </div>
      )}
    </div>
  );
}
