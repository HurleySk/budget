import { useState } from 'react';
import type { BudgetConfig, PayFrequency, ExpenseFrequency, RecurringExpense, WeekendHandling } from '../types';
import { PAY_FREQUENCY_LABELS, EXPENSE_FREQUENCY_LABELS, WEEKEND_HANDLING_LABELS } from '../types';
import { formatCurrency, getFirstOccurrenceOnOrAfter } from '../calculations';
import { generateUUID } from '../utils/uuid';

interface SettingsProps {
  config: BudgetConfig;
  onChange: (config: BudgetConfig) => void;
  onStartNewCycle: (startDate: string, startingBalance: number) => void;
  onViewHistory: () => void;
  onBack: () => void;
}

export function Settings({
  config,
  onChange,
  onStartNewCycle,
  onViewHistory,
  onBack,
}: SettingsProps) {
  const [showNewCycleForm, setShowNewCycleForm] = useState(false);
  const [newCycleDate, setNewCycleDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCycleBalance, setNewCycleBalance] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as ExpenseFrequency,
    nextDueDate: new Date().toISOString().split('T')[0],
  });
  const [editExpense, setEditExpense] = useState<{
    name: string;
    amount: string;
    frequency: ExpenseFrequency;
    nextDueDate: string;
  } | null>(null);

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

  const handleEditExpense = (expense: RecurringExpense) => {
    setEditingExpenseId(expense.id);
    setEditExpense({
      name: expense.name,
      amount: expense.amount.toString(),
      frequency: expense.frequency,
      nextDueDate: expense.nextDueDate,
    });
  };

  const handleSaveExpense = () => {
    if (editingExpenseId && editExpense && editExpense.name && editExpense.amount) {
      onChange({
        ...config,
        recurringExpenses: config.recurringExpenses.map(e =>
          e.id === editingExpenseId
            ? {
                ...e,
                name: editExpense.name,
                amount: parseFloat(editExpense.amount) || 0,
                frequency: editExpense.frequency,
                nextDueDate: editExpense.nextDueDate,
              }
            : e
        ),
      });
      setEditingExpenseId(null);
      setEditExpense(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setEditExpense(null);
  };

  const handleDeleteExpense = (id: string) => {
    onChange({
      ...config,
      recurringExpenses: config.recurringExpenses.filter(e => e.id !== id),
    });
    if (editingExpenseId === id) {
      setEditingExpenseId(null);
      setEditExpense(null);
    }
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

          {/* Semi-monthly pay day configuration */}
          {config.paycheckFrequency === 'semimonthly' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-primary-500 mb-1.5">
                  First pay day
                </label>
                <div className="relative">
                  <select
                    value={config.semiMonthlyConfig.firstPayDay}
                    onChange={(e) => onChange({
                      ...config,
                      semiMonthlyConfig: {
                        ...config.semiMonthlyConfig,
                        firstPayDay: parseInt(e.target.value)
                      }
                    })}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent bg-white text-primary-700 font-medium appearance-none cursor-pointer"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-primary-500 mb-1.5">
                  Second pay day
                </label>
                <div className="relative">
                  <select
                    value={config.semiMonthlyConfig.secondPayDay}
                    onChange={(e) => onChange({
                      ...config,
                      semiMonthlyConfig: {
                        ...config.semiMonthlyConfig,
                        secondPayDay: parseInt(e.target.value)
                      }
                    })}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent bg-white text-primary-700 font-medium appearance-none cursor-pointer"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}</option>
                    ))}
                    <option value={31}>Last day</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Weekend handling */}
          <div>
            <label className="block text-sm font-medium text-primary-600 mb-1">
              If payday falls on weekend
            </label>
            <select
              value={config.weekendHandling}
              onChange={(e) => onChange({ ...config, weekendHandling: e.target.value as WeekendHandling })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 bg-white"
            >
              {Object.entries(WEEKEND_HANDLING_LABELS).map(([value, label]) => (
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
              <div key={expense.id}>
                {editingExpenseId === expense.id && editExpense ? (
                  /* Edit Mode */
                  <div className="p-3 bg-sage-50 rounded-xl border border-sage-200 space-y-3">
                    <input
                      type="text"
                      value={editExpense.name}
                      onChange={(e) => setEditExpense({ ...editExpense, name: e.target.value })}
                      placeholder="Expense name"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
                    />
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 text-sm">$</span>
                        <input
                          type="number"
                          value={editExpense.amount}
                          onChange={(e) => setEditExpense({ ...editExpense, amount: e.target.value })}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
                          step="0.01"
                        />
                      </div>
                      <select
                        value={editExpense.frequency}
                        onChange={(e) => setEditExpense({ ...editExpense, frequency: e.target.value as ExpenseFrequency })}
                        className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500 bg-white text-sm"
                      >
                        {Object.entries(EXPENSE_FREQUENCY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-primary-500 mb-1">Next due date</label>
                      <input
                        type="date"
                        value={editExpense.nextDueDate}
                        onChange={(e) => setEditExpense({ ...editExpense, nextDueDate: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveExpense}
                        className="flex-1 px-3 py-2 text-sm font-medium text-white bg-sage-600 rounded-lg hover:bg-sage-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-2 text-sm font-medium text-primary-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-primary-700">{expense.name}</p>
                      <p className="text-sm text-primary-500">
                        {formatCurrency(expense.amount)} · {EXPENSE_FREQUENCY_LABELS[expense.frequency]}
                      </p>
                      <p className="text-xs text-primary-400">
                        Next due: {getFirstOccurrenceOnOrAfter(expense, new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditExpense(expense)}
                        className="w-8 h-8 flex items-center justify-center text-primary-400 hover:text-primary-600 hover:bg-stone-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="w-8 h-8 flex items-center justify-center text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {config.recurringExpenses.length === 0 && (
          <p className="text-sm text-primary-400 text-center py-4 mb-4">
            No recurring expenses yet. Add your first one below.
          </p>
        )}

        {/* Add New Expense Form */}
        <div className="space-y-3 p-3 bg-stone-50 rounded-xl">
          <p className="text-xs font-medium text-primary-500 uppercase tracking-wider">Add New</p>
          <input
            type="text"
            value={newExpense.name}
            onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
            placeholder="Expense name (e.g., Rent, Netflix)"
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
          <div>
            <label className="block text-xs text-primary-500 mb-1">Next due date</label>
            <input
              type="date"
              value={newExpense.nextDueDate}
              onChange={(e) => setNewExpense({ ...newExpense, nextDueDate: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
            />
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

        {/* Period History Button */}
        {(config.periods ?? []).length > 0 && (
          <button
            onClick={onViewHistory}
            className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View Period History ({(config.periods ?? []).filter(p => p.status === 'completed').length} completed)
          </button>
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
