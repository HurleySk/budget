import { useState, useEffect, useMemo } from 'react';
import type { BudgetConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import { generateProjection, calculateGoalDates, formatCurrency, formatDate } from './calculations';
import { saveBudget, loadBudget } from './storage';
import { BudgetForm } from './components/BudgetForm';
import { ProjectionChart } from './components/ProjectionChart';
import { ProjectionTable } from './components/ProjectionTable';

type ViewMode = 'chart' | 'table';

function App() {
  const [config, setConfig] = useState<BudgetConfig>(DEFAULT_CONFIG);
  const [view, setView] = useState<ViewMode>('chart');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadBudget();
    if (saved) {
      setConfig(saved);
    }
    setIsLoaded(true);
  }, []);

  // Auto-save on config changes (after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveBudget(config);
    }
  }, [config, isLoaded]);

  // Calculate projection (memoized)
  const projection = useMemo(() => {
    if (config.paycheckAmount <= 0) return [];
    return generateProjection(config);
  }, [config]);

  // Calculate goal dates (memoized)
  const goalDates = useMemo(() => {
    if (projection.length === 0) return null;
    return calculateGoalDates(config, projection);
  }, [config, projection]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Budget Tracker</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Budget Form */}
        <div className="mb-8">
          <BudgetForm config={config} onChange={setConfig} />
        </div>

        {/* Goal Timeline Summary */}
        {goalDates && config.savingsGoal > 0 && (
          <div className="bg-white p-4 rounded-lg shadow mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Goal Timeline: {formatCurrency(config.savingsGoal)}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {goalDates.dateBeforeExpenses ? (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">
                    Before Expenses
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    {formatDate(goalDates.dateBeforeExpenses)}
                  </p>
                  <p className="text-sm text-blue-600">
                    (ignoring all expenses)
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">
                    Before Expenses
                  </p>
                  <p className="text-lg font-bold text-gray-400">
                    Not achievable
                  </p>
                </div>
              )}

              {goalDates.dateAfterExpenses ? (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-600 font-medium">
                    After Expenses
                  </p>
                  <p className="text-lg font-bold text-amber-900">
                    {formatDate(goalDates.dateAfterExpenses)}
                  </p>
                  <p className="text-sm text-amber-600">
                    (after recurring expenses)
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">
                    After Expenses
                  </p>
                  <p className="text-lg font-bold text-gray-400">
                    Not achievable
                  </p>
                </div>
              )}

              {goalDates.dateAfterBaseline ? (
                <div className="p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                  <p className="text-sm text-purple-600 font-medium">
                    After All Spending
                  </p>
                  <p className="text-lg font-bold text-purple-900">
                    {formatDate(goalDates.dateAfterBaseline)}
                  </p>
                  <p className="text-sm text-purple-600">
                    {goalDates.daysToGoal > 0
                      ? `${goalDates.daysToGoal} days (${goalDates.periodsToGoal} pay periods)`
                      : 'Goal already reached!'}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-red-50 rounded-lg border-2 border-red-200">
                  <p className="text-sm text-red-600 font-medium">
                    After All Spending
                  </p>
                  <p className="text-lg font-bold text-red-700">
                    Not achievable
                  </p>
                  <p className="text-sm text-red-600">
                    Expenses exceed income
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View Toggle */}
        {projection.length > 0 && (
          <div className="flex justify-center mb-4">
            <div className="inline-flex rounded-md shadow-sm">
              <button
                onClick={() => setView('chart')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                  view === 'chart'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Chart
              </button>
              <button
                onClick={() => setView('table')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b ${
                  view === 'table'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Table
              </button>
            </div>
          </div>
        )}

        {/* Projection Display */}
        {view === 'chart' ? (
          <ProjectionChart data={projection} savingsGoal={config.savingsGoal} />
        ) : (
          <ProjectionTable data={projection} savingsGoal={config.savingsGoal} />
        )}

        {/* Empty State */}
        {projection.length === 0 && config.paycheckAmount === 0 && (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-500 text-lg">
              Enter your paycheck amount to see balance projections
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Your data is stored locally in your browser
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
