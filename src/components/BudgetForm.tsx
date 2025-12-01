import { useState } from 'react';
import type {
  BudgetConfig,
  PayFrequency,
  ExpenseFrequency,
  RecurringExpense,
  WeekendHandling,
} from '../types';
import {
  PAY_FREQUENCY_LABELS,
  EXPENSE_FREQUENCY_LABELS,
  WEEKEND_HANDLING_LABELS,
} from '../types';

interface BudgetFormProps {
  config: BudgetConfig;
  onChange: (config: BudgetConfig) => void;
  onBalanceUpdate: (balance: number) => void;
  calculatedBaseline: { average: number; count: number } | null;
  recordedPeriodsCount: number;
}

export function BudgetForm({ config, onChange, onBalanceUpdate, calculatedBaseline, recordedPeriodsCount }: BudgetFormProps) {
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as ExpenseFrequency,
    nextDueDate: new Date().toISOString().split('T')[0],
  });

  const updateField = <K extends keyof BudgetConfig>(
    field: K,
    value: BudgetConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  const handleAddExpense = () => {
    if (!newExpense.name || !newExpense.amount || !newExpense.nextDueDate) return;

    const expense: RecurringExpense = {
      id: crypto.randomUUID(),
      name: newExpense.name,
      amount: parseFloat(newExpense.amount),
      frequency: newExpense.frequency,
      nextDueDate: newExpense.nextDueDate,
    };

    updateField('recurringExpenses', [...config.recurringExpenses, expense]);
    setNewExpense({
      name: '',
      amount: '',
      frequency: 'monthly',
      nextDueDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleDeleteExpense = (id: string) => {
    updateField(
      'recurringExpenses',
      config.recurringExpenses.filter((e) => e.id !== id)
    );
  };

  const handleUpdateExpense = (id: string, updates: Partial<RecurringExpense>) => {
    updateField(
      'recurringExpenses',
      config.recurringExpenses.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      )
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Starting Balance and Savings Goal */}
      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        <div className="bg-white rounded-xl border border-neutral-200/60 shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
              Starting Balance
            </label>
            {config.currentBalanceAsOf && (
              <span className="text-xs text-neutral-400">
                as of {new Date(config.currentBalanceAsOf + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={config.currentBalance || ''}
              onChange={(e) =>
                onBalanceUpdate(parseFloat(e.target.value) || 0)
              }
              className="w-full pl-8 pr-4 py-3 text-base border border-neutral-300 rounded-lg transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 md:py-2 md:text-sm"
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">
            Your bank balance at the start of this pay period
          </p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200/60 shadow-sm p-4 md:p-5">
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
            Savings Goal
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={config.savingsGoal || ''}
              onChange={(e) =>
                updateField('savingsGoal', parseFloat(e.target.value) || 0)
              }
              className="w-full pl-8 pr-4 py-3 text-base border border-neutral-300 rounded-lg transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 md:py-2 md:text-sm"
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Paycheck Configuration */}
      <div className="bg-white rounded-xl border border-neutral-200/60 shadow-sm p-4 md:p-5">
        <h3 className="text-base font-semibold text-primary-800 mb-4">Paycheck Configuration</h3>

        <div className={`space-y-4 md:grid md:gap-4 md:space-y-0 mb-4 ${
          config.paycheckFrequency === 'weekly' || config.paycheckFrequency === 'biweekly'
            ? 'md:grid-cols-3'
            : 'md:grid-cols-2'
        }`}>
          {/* Amount */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={config.paycheckAmount || ''}
                onChange={(e) =>
                  updateField('paycheckAmount', parseFloat(e.target.value) || 0)
                }
                className="w-full pl-8 pr-4 py-3 text-base border border-neutral-300 rounded-lg transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 md:py-2 md:text-sm"
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
              Frequency
            </label>
            <select
              value={config.paycheckFrequency}
              onChange={(e) =>
                updateField('paycheckFrequency', e.target.value as PayFrequency)
              }
              className="w-full px-4 py-3 text-base border border-neutral-300 rounded-lg transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 md:py-2 md:text-sm"
            >
              {Object.entries(PAY_FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Next Pay Date - only shown for weekly/biweekly since monthly/semimonthly specify day of month */}
          {(config.paycheckFrequency === 'weekly' || config.paycheckFrequency === 'biweekly') && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
                Next Paycheck Date
              </label>
              <input
                type="date"
                value={config.nextPayDate}
                onChange={(e) => updateField('nextPayDate', e.target.value)}
                className="w-full px-4 py-3 text-base border border-neutral-300 rounded-lg transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 md:py-2 md:text-sm"
              />
            </div>
          )}
        </div>

        {/* Weekend Handling */}
        <div className="mb-4">
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
            If payday falls on weekend
          </label>
          <div className="flex flex-wrap gap-3 md:gap-4">
            {(Object.entries(WEEKEND_HANDLING_LABELS) as [WeekendHandling, string][]).map(
              ([value, label]) => (
                <label key={value} className="flex items-center gap-2 p-2 -m-2 min-h-[44px] cursor-pointer">
                  <input
                    type="radio"
                    name="weekendHandling"
                    value={value}
                    checked={config.weekendHandling === value}
                    onChange={(e) =>
                      updateField('weekendHandling', e.target.value as WeekendHandling)
                    }
                    className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700">{label}</span>
                </label>
              )
            )}
          </div>
        </div>

        {/* Semi-Monthly Pay Days (conditional) */}
        {config.paycheckFrequency === 'semimonthly' && (
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-3">
              Semi-Monthly Pay Days
            </label>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">First pay day</label>
                <select
                  value={config.semiMonthlyConfig.firstPayDay}
                  onChange={(e) =>
                    updateField('semiMonthlyConfig', {
                      ...config.semiMonthlyConfig,
                      firstPayDay: parseInt(e.target.value),
                    })
                  }
                  className="px-4 py-3 text-base border border-neutral-300 rounded-lg transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 md:py-2 md:text-sm"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Second pay day</label>
                <select
                  value={config.semiMonthlyConfig.secondPayDay}
                  onChange={(e) =>
                    updateField('semiMonthlyConfig', {
                      ...config.semiMonthlyConfig,
                      secondPayDay: parseInt(e.target.value),
                    })
                  }
                  className="px-4 py-3 text-base border border-neutral-300 rounded-lg transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 md:py-2 md:text-sm"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day === 31 ? '31 (Last day)' : day}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Pay Day (conditional) */}
        {config.paycheckFrequency === 'monthly' && (
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-3">
              Pay Day of Month
            </label>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <select
                  value={config.monthlyConfig.payDay}
                  onChange={(e) =>
                    updateField('monthlyConfig', {
                      payDay: parseInt(e.target.value),
                    })
                  }
                  className="px-4 py-3 text-base border border-neutral-300 rounded-lg transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 md:py-2 md:text-sm"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                  <option value={29}>29 (or last day)</option>
                  <option value={30}>30 (or last day)</option>
                  <option value={31}>Last day</option>
                </select>
              </div>
              <p className="text-xs text-neutral-500">
                Days 29-31 will be adjusted to the last day in shorter months
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Baseline Spend */}
      <div className="bg-white rounded-xl border border-neutral-200/60 shadow-sm p-4 md:p-5">
        <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
          Baseline Spend per Period
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={config.baselineSpendPerPeriod || ''}
            onChange={(e) =>
              updateField(
                'baselineSpendPerPeriod',
                parseFloat(e.target.value) || 0
              )
            }
            className={`w-full pl-8 pr-4 py-3 text-base border border-neutral-300 rounded-lg transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 md:py-2 md:text-sm ${
              config.useCalculatedBaseline ? 'opacity-50' : ''
            }`}
            placeholder="0.00"
            step="0.01"
            disabled={config.useCalculatedBaseline}
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Discretionary spending (groceries, gas, etc.) per pay period
        </p>

        {/* Calculated Baseline Section */}
        {(() => {
          const periodsRequired = config.periodsForBaselineCalc ?? 8;
          const periodsRemaining = periodsRequired - recordedPeriodsCount;

          if (recordedPeriodsCount >= periodsRequired && calculatedBaseline) {
            // Show calculated baseline with toggle
            const diff = calculatedBaseline.average - config.baselineSpendPerPeriod;
            return (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <div className="p-4 bg-accent-50 rounded-lg border border-accent-200">
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-700 mb-2">
                    Calculated Baseline Available
                  </p>
                  <p className="text-sm text-neutral-600 mb-3">
                    Based on {calculatedBaseline.count} tracked periods:
                  </p>
                  <div className="space-y-1 mb-4">
                    <p className="text-lg font-bold text-accent-800 tabular-nums">
                      ${calculatedBaseline.average.toFixed(2)} <span className="text-sm font-normal text-accent-600">/ period</span>
                    </p>
                    <p className="text-sm text-neutral-600">
                      Your estimate: ${config.baselineSpendPerPeriod.toFixed(2)}
                    </p>
                    {diff !== 0 && (
                      <p className={`text-sm ${diff > 0 ? 'text-danger-600' : 'text-accent-600'}`}>
                        Difference: {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.useCalculatedBaseline ?? false}
                      onChange={(e) => updateField('useCalculatedBaseline', e.target.checked)}
                      className="w-5 h-5 text-accent-600 focus:ring-accent-500 rounded"
                    />
                    <span className="text-sm font-medium text-neutral-700">
                      Use calculated baseline
                    </span>
                  </label>
                </div>
              </div>
            );
          } else if (recordedPeriodsCount > 0) {
            // Show progress
            return (
              <p className="mt-3 text-xs text-neutral-500">
                Track {periodsRemaining} more period{periodsRemaining !== 1 ? 's' : ''} to unlock calculated baseline
                <span className="text-neutral-400 ml-1">({recordedPeriodsCount}/{periodsRequired})</span>
              </p>
            );
          }
          return null;
        })()}
      </div>

      {/* Recurring Expenses */}
      <div className="bg-white rounded-xl border border-neutral-200/60 shadow-sm p-4 md:p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-primary-800">Recurring Expenses</h3>
        </div>

        {/* Existing Expenses */}
        {config.recurringExpenses.length > 0 ? (
          <div className="space-y-2 mb-4">
            {config.recurringExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100"
              >
                {editingExpense === expense.id ? (
                  <div className="flex-1 flex flex-col gap-3 md:flex-row md:items-center md:gap-2 md:flex-wrap">
                    <input
                      type="text"
                      value={expense.name}
                      onChange={(e) =>
                        handleUpdateExpense(expense.id, { name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm md:flex-1 md:min-w-[100px]"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={expense.amount}
                        onChange={(e) =>
                          handleUpdateExpense(expense.id, {
                            amount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm md:w-24 md:flex-none"
                        step="0.01"
                      />
                      <select
                        value={expense.frequency}
                        onChange={(e) =>
                          handleUpdateExpense(expense.id, {
                            frequency: e.target.value as ExpenseFrequency,
                          })
                        }
                        className="flex-1 px-3 py-2.5 border border-neutral-300 rounded-lg text-sm md:flex-none"
                      >
                        {Object.entries(EXPENSE_FREQUENCY_LABELS).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={expense.nextDueDate}
                        onChange={(e) =>
                          handleUpdateExpense(expense.id, { nextDueDate: e.target.value })
                        }
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => setEditingExpense(null)}
                        className="px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-neutral-800">{expense.name}</span>
                      <span className="text-neutral-500 ml-2 tabular-nums">
                        ${expense.amount.toFixed(2)}{' '}
                        <span className="text-neutral-400">{EXPENSE_FREQUENCY_LABELS[expense.frequency].toLowerCase()}</span>
                      </span>
                      <span className="text-neutral-400 ml-2 text-sm hidden sm:inline">
                        (next: {new Date(expense.nextDueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingExpense(expense.id)}
                        className="px-2 py-1 rounded-md text-xs font-medium text-neutral-600 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="px-2 py-1 rounded-md text-xs font-medium text-neutral-600 hover:text-danger-700 hover:bg-danger-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-neutral-500 mb-4">
            <p className="mb-1">No recurring expenses yet</p>
            <p className="text-xs">Add bills like rent, utilities, subscriptions below</p>
          </div>
        )}

        {/* Add New Expense */}
        <div className="pt-4 border-t border-neutral-200">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex md:items-end md:gap-2">
            <div className="sm:col-span-2 md:flex-1 md:min-w-[120px]">
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newExpense.name}
                onChange={(e) =>
                  setNewExpense((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="e.g., Rent"
              />
            </div>
            <div className="md:w-28">
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Amount
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={newExpense.amount}
                onChange={(e) =>
                  setNewExpense((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div className="md:w-36">
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Frequency
              </label>
              <select
                value={newExpense.frequency}
                onChange={(e) =>
                  setNewExpense((prev) => ({
                    ...prev,
                    frequency: e.target.value as ExpenseFrequency,
                  }))
                }
                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                {Object.entries(EXPENSE_FREQUENCY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:w-40">
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Next Due Date
              </label>
              <input
                type="date"
                value={newExpense.nextDueDate}
                onChange={(e) =>
                  setNewExpense((prev) => ({ ...prev, nextDueDate: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm transition-all duration-150 hover:border-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <button
              onClick={handleAddExpense}
              disabled={!newExpense.name || !newExpense.amount || !newExpense.nextDueDate}
              className="w-full py-3 px-4 bg-primary-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all duration-150 hover:bg-primary-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed md:w-auto md:py-2.5"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
