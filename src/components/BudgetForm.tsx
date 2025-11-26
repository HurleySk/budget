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
}

export function BudgetForm({ config, onChange }: BudgetFormProps) {
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as ExpenseFrequency,
  });

  const updateField = <K extends keyof BudgetConfig>(
    field: K,
    value: BudgetConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  const handleAddExpense = () => {
    if (!newExpense.name || !newExpense.amount) return;

    const expense: RecurringExpense = {
      id: crypto.randomUUID(),
      name: newExpense.name,
      amount: parseFloat(newExpense.amount),
      frequency: newExpense.frequency,
    };

    updateField('recurringExpenses', [...config.recurringExpenses, expense]);
    setNewExpense({ name: '', amount: '', frequency: 'monthly' });
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
    <div className="space-y-6">
      {/* Current Balance and Savings Goal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Balance
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              value={config.currentBalance || ''}
              onChange={(e) =>
                updateField('currentBalance', parseFloat(e.target.value) || 0)
              }
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Savings Goal
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              value={config.savingsGoal || ''}
              onChange={(e) =>
                updateField('savingsGoal', parseFloat(e.target.value) || 0)
              }
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Paycheck Configuration */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Paycheck Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={config.paycheckAmount || ''}
                onChange={(e) =>
                  updateField('paycheckAmount', parseFloat(e.target.value) || 0)
                }
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frequency
            </label>
            <select
              value={config.paycheckFrequency}
              onChange={(e) =>
                updateField('paycheckFrequency', e.target.value as PayFrequency)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(PAY_FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Next Pay Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Next Paycheck Date
            </label>
            <input
              type="date"
              value={config.nextPayDate}
              onChange={(e) => updateField('nextPayDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Weekend Handling */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            If payday falls on weekend
          </label>
          <div className="flex flex-wrap gap-4">
            {(Object.entries(WEEKEND_HANDLING_LABELS) as [WeekendHandling, string][]).map(
              ([value, label]) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="weekendHandling"
                    value={value}
                    checked={config.weekendHandling === value}
                    onChange={(e) =>
                      updateField('weekendHandling', e.target.value as WeekendHandling)
                    }
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              )
            )}
          </div>
        </div>

        {/* Semi-Monthly Pay Days (conditional) */}
        {config.paycheckFrequency === 'semimonthly' && (
          <div className="p-3 bg-gray-50 rounded-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semi-Monthly Pay Days
            </label>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">First pay day</label>
                <select
                  value={config.semiMonthlyConfig.firstPayDay}
                  onChange={(e) =>
                    updateField('semiMonthlyConfig', {
                      ...config.semiMonthlyConfig,
                      firstPayDay: parseInt(e.target.value),
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Second pay day</label>
                <select
                  value={config.semiMonthlyConfig.secondPayDay}
                  onChange={(e) =>
                    updateField('semiMonthlyConfig', {
                      ...config.semiMonthlyConfig,
                      secondPayDay: parseInt(e.target.value),
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <div className="p-3 bg-gray-50 rounded-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <p className="text-xs text-gray-500">
                Days 29-31 will be adjusted to the last day in shorter months
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Baseline Spend */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Baseline Spend per Period
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              value={config.baselineSpendPerPeriod || ''}
              onChange={(e) =>
                updateField(
                  'baselineSpendPerPeriod',
                  parseFloat(e.target.value) || 0
                )
              }
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Discretionary spending (groceries, gas, etc.) per pay period
          </p>
        </div>
      </div>

      {/* Recurring Expenses */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recurring Expenses</h3>
        </div>

        {/* Existing Expenses */}
        {config.recurringExpenses.length > 0 && (
          <div className="space-y-2 mb-4">
            {config.recurringExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                {editingExpense === expense.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={expense.name}
                      onChange={(e) =>
                        handleUpdateExpense(expense.id, { name: e.target.value })
                      }
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="number"
                      value={expense.amount}
                      onChange={(e) =>
                        handleUpdateExpense(expense.id, {
                          amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      step="0.01"
                    />
                    <select
                      value={expense.frequency}
                      onChange={(e) =>
                        handleUpdateExpense(expense.id, {
                          frequency: e.target.value as ExpenseFrequency,
                        })
                      }
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {Object.entries(EXPENSE_FREQUENCY_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                    <button
                      onClick={() => setEditingExpense(null)}
                      className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="font-medium">{expense.name}</span>
                      <span className="text-gray-500 ml-2">
                        ${expense.amount.toFixed(2)}{' '}
                        {EXPENSE_FREQUENCY_LABELS[expense.frequency].toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingExpense(expense.id)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add New Expense */}
        <div className="flex items-end gap-2 pt-3 border-t border-gray-200">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Name
            </label>
            <input
              type="text"
              value={newExpense.name}
              onChange={(e) =>
                setNewExpense((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="e.g., Rent"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Amount
            </label>
            <input
              type="number"
              value={newExpense.amount}
              onChange={(e) =>
                setNewExpense((prev) => ({ ...prev, amount: e.target.value }))
              }
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-600 mb-1">
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
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              {Object.entries(EXPENSE_FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddExpense}
            disabled={!newExpense.name || !newExpense.amount}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
