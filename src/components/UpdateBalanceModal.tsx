import { useState, useEffect } from 'react';

interface UpdateBalanceModalProps {
  isOpen: boolean;
  currentBalance: number;
  onSave: (balance: number, asOfDate: string) => void;
  onClose: () => void;
}

export function UpdateBalanceModal({
  isOpen,
  currentBalance,
  onSave,
  onClose,
}: UpdateBalanceModalProps) {
  const [balance, setBalance] = useState('');
  const [asOfDate, setAsOfDate] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setBalance(currentBalance.toString());
      setAsOfDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, currentBalance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numBalance = parseFloat(balance);
    if (!isNaN(numBalance) && asOfDate) {
      onSave(numBalance, asOfDate);
      onClose();
    }
  };

  if (!isOpen) return null;

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
            Update Current Balance
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary-600 mb-2">
                Current balance
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 font-medium">
                  $
                </span>
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 text-lg font-mono tabular-nums border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-600 mb-2">
                As of
              </label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
              />
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
                disabled={!balance || !asOfDate}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-sage-600 rounded-xl hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
