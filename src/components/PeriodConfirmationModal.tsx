import { useState } from 'react';
import type { VarianceReason, VarianceExplanation } from '../types';
import { formatCurrency } from '../calculations';

interface PeriodConfirmationModalProps {
  isOpen: boolean;
  periodEndDate: string;
  projectedBalance: number;
  onConfirm: (actualBalance: number, explanations: VarianceExplanation[]) => void;
  onDismiss: () => void;
  onRemindLater: () => void;
}

interface VarianceEntry {
  id: string;
  reason: VarianceReason;
  amount: string;
  description: string;
}

const VARIANCE_LABELS: Record<VarianceReason, { label: string; description: string }> = {
  adhoc_expense: {
    label: 'One-time expense',
    description: 'Unexpected expense (won\'t affect baseline calculation)',
  },
  planned_cost_higher: {
    label: 'Planned expense cost more',
    description: 'A recurring bill was higher than expected',
  },
  baseline_miss: {
    label: 'Higher discretionary spending',
    description: 'Spent more on day-to-day items (will be included in baseline average)',
  },
};

export function PeriodConfirmationModal({
  isOpen,
  periodEndDate,
  projectedBalance,
  onConfirm,
  onDismiss,
  onRemindLater,
}: PeriodConfirmationModalProps) {
  const [actualBalance, setActualBalance] = useState<string>(projectedBalance.toFixed(2));
  const [varianceEntries, setVarianceEntries] = useState<VarianceEntry[]>([]);
  const [showVarianceForm, setShowVarianceForm] = useState(false);

  const actualNum = parseFloat(actualBalance) || 0;
  const variance = projectedBalance - actualNum;
  const hasUnderProjection = variance > 0.01; // Spent more than projected

  const totalExplained = varianceEntries.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
    0
  );
  const unexplainedVariance = variance - totalExplained;

  const addVarianceEntry = () => {
    setVarianceEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        reason: 'adhoc_expense',
        amount: '',
        description: '',
      },
    ]);
  };

  const updateVarianceEntry = (id: string, updates: Partial<VarianceEntry>) => {
    setVarianceEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const removeVarianceEntry = (id: string) => {
    setVarianceEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleConfirm = () => {
    const explanations: VarianceExplanation[] = varianceEntries
      .filter((e) => parseFloat(e.amount) > 0)
      .map((e) => ({
        reason: e.reason,
        amount: parseFloat(e.amount),
        description: e.description || undefined,
        affectsBaseline: e.reason === 'baseline_miss',
      }));

    // If there's unexplained variance, treat it as baseline miss
    if (unexplainedVariance > 0.01) {
      explanations.push({
        reason: 'baseline_miss',
        amount: unexplainedVariance,
        affectsBaseline: true,
      });
    }

    onConfirm(actualNum, explanations);
  };

  if (!isOpen) return null;

  const formattedDate = new Date(periodEndDate + 'T00:00:00').toLocaleDateString(
    'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-primary-800">
            Confirm Period Ending
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Your pay period ended on {formattedDate}
          </p>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Projected vs Actual */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 rounded-lg">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1">
                Projected Balance
              </p>
              <p className="text-xl font-bold text-neutral-700 tabular-nums">
                {formatCurrency(projectedBalance)}
              </p>
            </div>
            <div className="p-4 bg-primary-50 rounded-lg border-2 border-primary-200">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-600 mb-1">
                Actual Balance
              </p>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-primary-400">
                  $
                </span>
                <input
                  type="number"
                  value={actualBalance}
                  onChange={(e) => {
                    setActualBalance(e.target.value);
                    setShowVarianceForm(true);
                  }}
                  className="w-full pl-4 text-xl font-bold text-primary-800 bg-transparent border-none focus:outline-none tabular-nums"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Variance Section */}
          {hasUnderProjection && showVarianceForm && (
            <div className="p-4 bg-warning-50 rounded-lg border border-warning-200">
              <p className="text-sm font-medium text-warning-800 mb-3">
                You spent {formatCurrency(variance)} more than projected.
                What happened?
              </p>

              {/* Variance Entries */}
              {varianceEntries.length > 0 && (
                <div className="space-y-3 mb-4">
                  {varianceEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 bg-white rounded-lg border border-warning-200"
                    >
                      <div className="flex gap-2 mb-2">
                        <select
                          value={entry.reason}
                          onChange={(e) =>
                            updateVarianceEntry(entry.id, {
                              reason: e.target.value as VarianceReason,
                            })
                          }
                          className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg"
                        >
                          {Object.entries(VARIANCE_LABELS).map(([value, { label }]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeVarianceEntry(entry.id)}
                          className="px-2 text-neutral-400 hover:text-danger-600"
                        >
                          &times;
                        </button>
                      </div>
                      <p className="text-xs text-neutral-500 mb-2">
                        {VARIANCE_LABELS[entry.reason].description}
                      </p>
                      <div className="flex gap-2">
                        <div className="relative w-28">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                            $
                          </span>
                          <input
                            type="number"
                            value={entry.amount}
                            onChange={(e) =>
                              updateVarianceEntry(entry.id, { amount: e.target.value })
                            }
                            placeholder="0.00"
                            className="w-full pl-7 pr-3 py-2 text-sm border border-neutral-300 rounded-lg"
                            step="0.01"
                          />
                        </div>
                        <input
                          type="text"
                          value={entry.description}
                          onChange={(e) =>
                            updateVarianceEntry(entry.id, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Note (optional)"
                          className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Entry Button */}
              <button
                onClick={addVarianceEntry}
                className="text-sm font-medium text-warning-700 hover:text-warning-800"
              >
                + Add explanation
              </button>

              {/* Summary */}
              {varianceEntries.length > 0 && (
                <div className="mt-4 pt-3 border-t border-warning-200 text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <span>Total explained:</span>
                    <span className="tabular-nums">{formatCurrency(totalExplained)}</span>
                  </div>
                  {unexplainedVariance > 0.01 && (
                    <div className="flex justify-between text-warning-700 font-medium mt-1">
                      <span>Unexplained (counts as baseline):</span>
                      <span className="tabular-nums">
                        {formatCurrency(unexplainedVariance)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-200 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onRemindLater}
            className="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            Remind me later
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            Skip this period
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2.5 text-sm font-medium text-white bg-primary-700 hover:bg-primary-800 rounded-lg transition-colors shadow-sm"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
