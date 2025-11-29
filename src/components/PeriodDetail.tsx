import { useState } from 'react';
import { format } from 'date-fns';
import type { ProjectionEntry, AdHocTransaction } from '../types';
import { formatCurrency } from '../calculations';

interface PeriodDetailProps {
  period: ProjectionEntry;
  adHocTransactions: AdHocTransaction[];
  onAddTransaction: (txn: Omit<AdHocTransaction, 'id'>) => void;
  onUpdateTransaction: (txn: AdHocTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onBack: () => void;
}

interface NewTransaction {
  name: string;
  amount: string;
  isIncome: boolean;
}

const EMPTY_NEW_TRANSACTION: NewTransaction = {
  name: '',
  amount: '',
  isIncome: false,
};

export function PeriodDetail({
  period,
  adHocTransactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onBack,
}: PeriodDetailProps) {
  const [newTransaction, setNewTransaction] = useState<NewTransaction>(EMPTY_NEW_TRANSACTION);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTransaction, setEditTransaction] = useState<NewTransaction>(EMPTY_NEW_TRANSACTION);

  const handleAdd = () => {
    const amount = parseFloat(newTransaction.amount);
    if (!newTransaction.name.trim() || isNaN(amount) || amount <= 0) return;

    onAddTransaction({
      periodNumber: period.periodNumber,
      name: newTransaction.name.trim(),
      amount,
      isIncome: newTransaction.isIncome,
    });
    setNewTransaction(EMPTY_NEW_TRANSACTION);
  };

  const handleStartEdit = (txn: AdHocTransaction) => {
    setEditingId(txn.id);
    setEditTransaction({
      name: txn.name,
      amount: txn.amount.toString(),
      isIncome: txn.isIncome,
    });
  };

  const handleSaveEdit = (txn: AdHocTransaction) => {
    const amount = parseFloat(editTransaction.amount);
    if (!editTransaction.name.trim() || isNaN(amount) || amount <= 0) return;

    onUpdateTransaction({
      ...txn,
      name: editTransaction.name.trim(),
      amount,
      isIncome: editTransaction.isIncome,
    });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTransaction(EMPTY_NEW_TRANSACTION);
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          <span>&larr;</span> Back
        </button>
        <h2 className="text-xl font-bold text-gray-900">
          Period {period.periodNumber} &mdash; {format(period.date, 'MMM d, yyyy')}
        </h2>
      </div>

      {/* Balance summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">After Income</p>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(period.balanceAfterIncome)}
          </p>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg">
          <p className="text-sm text-amber-600 font-medium">After Expenses</p>
          <p className="text-2xl font-bold text-amber-900">
            {formatCurrency(period.balanceAfterExpenses)}
          </p>
        </div>
        <div className={`p-4 rounded-lg ${period.balanceAfterBaseline < 0 ? 'bg-red-50' : 'bg-purple-50'}`}>
          <p className={`text-sm font-medium ${period.balanceAfterBaseline < 0 ? 'text-red-600' : 'text-purple-600'}`}>
            After Baseline
          </p>
          <p className={`text-2xl font-bold ${period.balanceAfterBaseline < 0 ? 'text-red-900' : 'text-purple-900'}`}>
            {formatCurrency(period.balanceAfterBaseline)}
          </p>
        </div>
      </div>

      {/* Period breakdown */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Period Breakdown</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Paycheck</span>
            <span className="text-green-600 font-medium">+{formatCurrency(period.income)}</span>
          </div>
          {period.adHocIncome > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Ad-hoc Income</span>
              <span className="text-green-600 font-medium">+{formatCurrency(period.adHocIncome)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Recurring Expenses</span>
            <span className="text-red-600 font-medium">-{formatCurrency(period.expenses)}</span>
          </div>
          {period.adHocExpenses > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Ad-hoc Expenses</span>
              <span className="text-red-600 font-medium">-{formatCurrency(period.adHocExpenses)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Baseline Spend</span>
            <span className="text-orange-600 font-medium">-{formatCurrency(period.baselineSpend)}</span>
          </div>
        </div>
      </div>

      {/* Recurring Expenses */}
      {period.expenseDetails.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Recurring Expenses</h3>
          <ul className="space-y-2">
            {period.expenseDetails.map((expense, idx) => (
              <li key={idx} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {expense.name}
                  <span className="text-gray-400 ml-2">({format(expense.date, 'MMM d')})</span>
                </span>
                <span className="text-red-600 font-medium">-{formatCurrency(expense.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ad-hoc Transactions */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-3">One-Time Transactions</h3>

        {/* Existing ad-hoc transactions */}
        {adHocTransactions.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {adHocTransactions.map((txn) => (
              <li key={txn.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100">
                {editingId === txn.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editTransaction.name}
                      onChange={(e) => setEditTransaction(prev => ({ ...prev, name: e.target.value }))}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="number"
                      value={editTransaction.amount}
                      onChange={(e) => setEditTransaction(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                      step="0.01"
                    />
                    <select
                      value={editTransaction.isIncome ? 'income' : 'expense'}
                      onChange={(e) => setEditTransaction(prev => ({ ...prev, isIncome: e.target.value === 'income' }))}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <button
                      onClick={() => handleSaveEdit(txn)}
                      className="text-green-600 hover:text-green-800 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${txn.isIncome ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {txn.isIncome ? 'Income' : 'Expense'}
                      </span>
                      <span className="text-gray-700">{txn.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${txn.isIncome ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                      </span>
                      <button
                        onClick={() => handleStartEdit(txn)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(txn.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm mb-4">No one-time transactions for this period.</p>
        )}

        {/* Add new transaction form */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Add Transaction</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newTransaction.name}
              onChange={(e) => setNewTransaction(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Name"
              className="flex-1 min-w-[150px] px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="number"
              value={newTransaction.amount}
              onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Amount"
              className="w-28 px-3 py-2 border border-gray-300 rounded-md text-sm"
              min="0"
              step="0.01"
            />
            <select
              value={newTransaction.isIncome ? 'income' : 'expense'}
              onChange={(e) => setNewTransaction(prev => ({ ...prev, isIncome: e.target.value === 'income' }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={!newTransaction.name.trim() || !newTransaction.amount}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
