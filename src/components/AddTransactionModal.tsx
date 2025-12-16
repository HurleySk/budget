import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { AdHocTransaction, ProjectionEntry } from '../types';
import { formatDate } from '../calculations';

interface AddTransactionModalProps {
  isOpen: boolean;
  periods: ProjectionEntry[];
  defaultPeriod?: number;
  onAdd: (txn: Omit<AdHocTransaction, 'id'>) => void;
  onClose: () => void;
}

export function AddTransactionModal({
  isOpen,
  periods,
  defaultPeriod,
  onAdd,
  onClose,
}: AddTransactionModalProps) {
  const [periodNumber, setPeriodNumber] = useState(0);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [isIncome, setIsIncome] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPeriodNumber(defaultPeriod ?? 0);
      setName('');
      setAmount('');
      setIsIncome(false);
    }
  }, [isOpen, defaultPeriod]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (name.trim() && !isNaN(numAmount) && numAmount > 0) {
      // Find the selected period to get its start date
      const selectedPeriod = periods.find(p => p.periodNumber === periodNumber);
      const periodStartDate = selectedPeriod
        ? format(selectedPeriod.startDate, 'yyyy-MM-dd')
        : undefined;

      onAdd({
        periodNumber,
        periodStartDate,  // Immutable anchor to prevent period drift
        name: name.trim(),
        amount: numAmount,
        isIncome,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  // Get current and past periods for selection
  const selectablePeriods = periods.filter(p => p.periodNumber <= Math.max(...periods.map(pp => pp.periodNumber)));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-primary-800 text-center mb-6">
            Add Transaction
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Period Selector */}
            <div>
              <label className="block text-sm font-medium text-primary-600 mb-2">
                Period
              </label>
              <select
                value={periodNumber}
                onChange={(e) => setPeriodNumber(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent bg-white"
              >
                {selectablePeriods.slice(0, 10).map((period) => (
                  <option key={period.periodNumber} value={period.periodNumber}>
                    Period {period.periodNumber}
                    {period.periodNumber === 0 ? ' (Current)' : ''} · {formatDate(period.startDate)}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-primary-600 mb-2">
                Description
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                placeholder="e.g., Car repair"
                autoFocus
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-primary-600 mb-2">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 font-medium">
                  $
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 text-lg font-mono tabular-nums border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-primary-600 mb-2">
                Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsIncome(false)}
                  className={`flex-1 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                    !isIncome
                      ? 'bg-warning-100 text-warning-700 border-2 border-warning-300'
                      : 'bg-stone-100 text-primary-600 border-2 border-transparent'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setIsIncome(true)}
                  className={`flex-1 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                    isIncome
                      ? 'bg-sage-100 text-sage-700 border-2 border-sage-300'
                      : 'bg-stone-100 text-primary-600 border-2 border-transparent'
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 text-sm font-medium text-primary-600 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || !amount || parseFloat(amount) <= 0}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-sage-600 rounded-xl hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
