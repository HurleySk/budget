import { useState } from 'react';
import type { BudgetConfig, PayFrequency, ExpenseFrequency } from '../types';
import { PAY_FREQUENCY_LABELS, EXPENSE_FREQUENCY_LABELS } from '../types';
import { formatCurrency } from '../calculations';
import { generateUUID } from '../utils/uuid';

interface SettingsProps {
  config: BudgetConfig;
  onChange: (config: BudgetConfig) => void;
  onStartNewCycle: (startDate: string, startingBalance: number) => void;
  onBack: () => void;
}

export function Settings({
  config,
  onChange,
  onStartNewCycle,
  onBack,
}: SettingsProps) {
  const [showNewCycleForm, setShowNewCycleForm] = useState(false);
  const [newCycleDate, setNewCycleDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCycleBalance, setNewCycleBalance] = useState('');
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as ExpenseFrequency,
    nextDueDate: new Date().toISOString().split('T')[0],
  });

  const handleAddExpense = () => {
    if (newExpense.name && newExpense.amount && parseFloat(newExpense.amount) > 0) {
      onChange({
        ...config,
        recurringExpenses: [
          ...config.recurringExpenses,
          {
            id: generateUUID(),
            name: newExpense.name,
            amount: parseFloat(newExpense.amount),
            frequency: newExpense.frequency,
            nextDueDate: newExpense.nextDueDate,
          },
        ],
      });
      setNewExpense({
        name: '',
        amount: '',
        frequency: 'monthly',
        nextDueDate: new Date().toISOString().split('T')[0],
      });
    }
  };

  const handleDeleteExpense = (id: string) => {
    onChange({
      ...config,
      recurringExpenses: config.recurringExpenses.filter(e => e.id !== id),
    });
  };

  const handleStartNewCycle = () => {
    const balance = parseFloat(newCycleBalance);
    if (!isNaN(balance) && balance > 0 && newCycleDate) {
      onStartNewCycle(newCycleDate, balance);
      setShowNewCycleForm(false);
      setNewCycleBalance('');
      setNewCycleDate(new Date().toISOString().split('T')[0]);
    }
  };

  return (
    <div className="space-y-6">
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
        <h1 className="text-xl font-semibold text-primary-800">Settings</h1>
      </div>

      {/* Income Section */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-primary-500 mb-4">
          Income
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-600 mb-1">
              Paycheck amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400">$</span>
              <input
                type="number"
                value={config.paycheckAmount || ''}
                onChange={(e) => onChange({ ...config, paycheckAmount: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500"
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-600 mb-1">
              Frequency
            </label>
            <select
              value={config.paycheckFrequency}
              onChange={(e) => onChange({ ...config, paycheckFrequency: e.target.value as PayFrequency })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 bg-white"
            >
              {Object.entries(PAY_FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-600 mb-1">
              Next pay date
            </label>
            <input
              type="date"
              value={config.nextPayDate}
              onChange={(e) => onChange({ ...config, nextPayDate: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500"
            />
          </div>
        </div>
      </div>

      {/* Recurring Expenses Section */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-primary-500 mb-4">
          Recurring Expenses
        </h2>

        {config.recurringExpenses.length > 0 && (
          <div className="space-y-2 mb-4">
            {config.recurringExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 bg-stone-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-primary-700">{expense.name}</p>
                  <p className="text-sm text-primary-500">
                    {formatCurrency(expense.amount)} · {EXPENSE_FREQUENCY_LABELS[expense.frequency]}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteExpense(expense.id)}
                  className="w-8 h-8 flex items-center justify-center text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Expense Form */}
        <div className="space-y-3 p-3 bg-stone-50 rounded-xl">
          <input
            type="text"
            value={newExpense.name}
            onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
            placeholder="Expense name"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 text-sm">$</span>
              <input
                type="number"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
                step="0.01"
              />
            </div>
            <select
              value={newExpense.frequency}
              onChange={(e) => setNewExpense({ ...newExpense, frequency: e.target.value as ExpenseFrequency })}
              className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500 bg-white text-sm"
            >
              {Object.entries(EXPENSE_FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddExpense}
            disabled={!newExpense.name || !newExpense.amount}
            className="w-full px-4 py-2 text-sm font-medium text-sage-700 bg-sage-100 rounded-lg hover:bg-sage-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add expense
          </button>
        </div>
      </div>

      {/* Projection Settings */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-primary-500 mb-4">
          Projection
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-600 mb-1">
              Baseline spend/period
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400">$</span>
              <input
                type="number"
                value={config.baselineSpendPerPeriod || ''}
                onChange={(e) => onChange({ ...config, baselineSpendPerPeriod: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500"
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <p className="text-xs text-primary-400 mt-1">
              Estimated discretionary spending per pay period
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-600 mb-1">
              Savings goal
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400">$</span>
              <input
                type="number"
                value={config.savingsGoal || ''}
                onChange={(e) => onChange({ ...config, savingsGoal: parseFloat(e.target.value) || 0 })}
                className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500"
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Budget Cycle */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-primary-500 mb-4">
          Budget Cycle
        </h2>

        {config.budgetStartDate && (
          <p className="text-sm text-primary-600 mb-4">
            Started: {new Date(config.budgetStartDate + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        )}

        {!showNewCycleForm ? (
          <button
            onClick={() => setShowNewCycleForm(true)}
            className="text-sm font-medium text-danger-600 hover:text-danger-700 transition-colors"
          >
            Reset & Start New Cycle
          </button>
        ) : (
          <div className="p-4 bg-danger-50 rounded-xl border border-danger-200">
            <p className="text-sm text-danger-700 mb-4">
              This will archive your current history and begin fresh tracking.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-danger-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newCycleDate}
                  onChange={(e) => setNewCycleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-danger-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-danger-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-danger-600 mb-1">
                  Starting Balance
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-danger-400">$</span>
                  <input
                    type="number"
                    value={newCycleBalance}
                    onChange={(e) => setNewCycleBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-danger-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-danger-500"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleStartNewCycle}
                disabled={!newCycleBalance || !newCycleDate || parseFloat(newCycleBalance) <= 0}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-danger-600 rounded-lg hover:bg-danger-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start New Cycle
              </button>
              <button
                onClick={() => {
                  setShowNewCycleForm(false);
                  setNewCycleBalance('');
                }}
                className="px-4 py-2 text-sm font-medium text-danger-600 bg-white border border-danger-300 rounded-lg hover:bg-danger-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
