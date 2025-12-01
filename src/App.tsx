import { useState, useEffect, useMemo, useCallback } from 'react';
import type { BudgetConfig, AdHocTransaction } from './types';
import { DEFAULT_CONFIG } from './types';
import { generateProjection, calculateGoalDates, formatCurrency, formatDate, advancePassedDates, calculateAverageBaseline, handlePeriodTransition, calculateTrueSpend } from './calculations';
import { saveBudget, loadBudget } from './storage';
import { BudgetForm } from './components/BudgetForm';
import { ProjectionChart } from './components/ProjectionChart';
import { ProjectionTable } from './components/ProjectionTable';
import { PeriodDetail } from './components/PeriodDetail';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { useCurrentDay } from './hooks/useCurrentDay';
import { useIsDesktop } from './hooks/useMediaQuery';

type ViewMode = 'form' | 'chart' | 'table';

function App() {
  const [config, setConfig] = useState<BudgetConfig>(DEFAULT_CONFIG);
  const [view, setView] = useState<ViewMode>('chart');
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Projections refreshed');

  // Track current day - updates automatically at midnight
  const { currentDay, forceRefresh } = useCurrentDay();

  // Wrapped refresh handler that shows toast
  const handleRefresh = useCallback(() => {
    forceRefresh();
    setToastMessage('Projections refreshed');
    setShowToast(true);
  }, [forceRefresh]);

  // Track if we're on desktop (md breakpoint)
  const isDesktop = useIsDesktop();

  // Load from JSON file on mount
  useEffect(() => {
    loadBudget().then((saved) => {
      if (saved) {
        setConfig(saved);
      }
      setIsLoaded(true);
    });
  }, []);

  // Auto-save to JSON file on config changes (after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveBudget(config);
    }
  }, [config, isLoaded]);

  // Auto-advance any dates that have passed (on load and day change)
  // Also handle period transitions (update currentBalance)
  useEffect(() => {
    if (!isLoaded) return;

    const today = new Date();

    // First, generate current projection to use for transition calculation
    const currentProjection = generateProjection(config);

    // Handle period transition FIRST (updates currentBalance)
    const transitionResult = handlePeriodTransition(config, today, currentProjection);
    if (transitionResult) {
      setToastMessage(`Balance updated to ${formatCurrency(transitionResult.newBalance)}`);
      setShowToast(true);

      // Then advance dates on the transitioned config
      const advanced = advancePassedDates(transitionResult.config, today);
      setConfig(advanced ?? transitionResult.config);
    } else {
      // No transition, just advance dates
      const advanced = advancePassedDates(config, today);
      if (advanced) {
        setConfig(advanced);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, currentDay]); // Intentionally exclude config to avoid infinite loop

  // Calculate projection (memoized) - recalculates when config or date changes
  const projection = useMemo(() => {
    // currentDay is used to trigger recalculation at midnight
    void currentDay;
    // Use calculated baseline if enabled and we have enough data
    const useCalc = config.useCalculatedBaseline;
    const periodSpendHistory = config.periodSpendHistory ?? [];
    const periodsRequired = config.periodsForBaselineCalc ?? 8;

    // If using calculated baseline and we have enough periods, calculate with it
    if (useCalc && periodSpendHistory.length >= periodsRequired) {
      const calcResult = calculateAverageBaseline(periodSpendHistory, periodsRequired);
      if (calcResult) {
        return generateProjection(config, calcResult.average);
      }
    }

    return generateProjection(config);
  }, [config, currentDay]);

  // Calculate goal dates (memoized)
  const goalDates = useMemo(() => {
    if (projection.length === 0) return null;
    // currentDay ensures "days to goal" updates at midnight
    void currentDay;
    return calculateGoalDates(config, projection);
  }, [config, projection, currentDay]);

  // Get selected period data
  const selectedPeriodData = selectedPeriod !== null
    ? projection.find(p => p.periodNumber === selectedPeriod)
    : null;

  // Ad-hoc transaction CRUD handlers
  const handleAddTransaction = (txn: Omit<AdHocTransaction, 'id'>) => {
    setConfig(prev => ({
      ...prev,
      adHocTransactions: [
        ...(prev.adHocTransactions ?? []),
        { ...txn, id: crypto.randomUUID() }
      ]
    }));
  };

  const handleUpdateTransaction = (txn: AdHocTransaction) => {
    setConfig(prev => ({
      ...prev,
      adHocTransactions: (prev.adHocTransactions ?? []).map(t =>
        t.id === txn.id ? txn : t
      )
    }));
  };

  const handleDeleteTransaction = (id: string) => {
    setConfig(prev => ({
      ...prev,
      adHocTransactions: (prev.adHocTransactions ?? []).filter(t => t.id !== id)
    }));
  };

  // Handle starting balance update from user
  const handleBalanceUpdate = useCallback((newBalance: number) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    setConfig(prev => {
      // Check if this is a new period (user entering balance after transition)
      const isFirstUpdate = !prev.periodStartSnapshot;
      const snapshot = prev.periodStartSnapshot;

      // If we have a snapshot from a previous period, calculate true spend
      if (snapshot && snapshot.periodStartDate !== todayStr) {
        // Find the current period in projection to get income/expense data
        const currentPeriod = projection.find(p => p.periodNumber === 0) ?? projection[0];

        if (currentPeriod) {
          const result = calculateTrueSpend(
            snapshot.balance,
            currentPeriod.income,
            currentPeriod.expenses,
            currentPeriod.adHocIncome,
            currentPeriod.adHocExpenses,
            newBalance
          );

          // Record in history
          const historyEntry = {
            periodEndDate: snapshot.periodStartDate,
            startingBalance: snapshot.balance,
            expectedEnding: result.expectedEnding,
            actualEnding: newBalance,
            trueSpend: result.trueSpend,
          };

          return {
            ...prev,
            currentBalance: newBalance,
            currentBalanceAsOf: todayStr,
            periodSpendHistory: [...(prev.periodSpendHistory ?? []), historyEntry],
            periodStartSnapshot: { periodStartDate: todayStr, balance: newBalance },
          };
        }
      }

      // Same period or first update - just update balance
      return {
        ...prev,
        currentBalance: newBalance,
        currentBalanceAsOf: todayStr,
        periodStartSnapshot: isFirstUpdate
          ? { periodStartDate: todayStr, balance: newBalance }
          : prev.periodStartSnapshot,
      };
    });
  }, [projection]);

  // Calculate average baseline from period spend history
  const calculatedBaseline = useMemo(() => {
    const periodSpendHistory = config.periodSpendHistory ?? [];
    const periodsRequired = config.periodsForBaselineCalc ?? 8;
    return calculateAverageBaseline(periodSpendHistory, periodsRequired);
  }, [config.periodSpendHistory, config.periodsForBaselineCalc]);

  const recordedPeriodsCount = (config.periodSpendHistory ?? []).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-b from-primary-900 to-primary-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-500 flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Budget Tracker</h1>
                <p className="text-xs text-primary-300">Plan your financial future</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="w-10 h-10 rounded-lg bg-primary-700/50 hover:bg-primary-600/50 flex items-center justify-center transition-colors"
              title="Refresh projections"
            >
              <svg className="w-5 h-5 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 py-4 pb-20 sm:px-6 md:pb-6">
        {selectedPeriod !== null && selectedPeriodData ? (
          /* Period Detail View */
          <PeriodDetail
            period={selectedPeriodData}
            adHocTransactions={(config.adHocTransactions ?? []).filter(t => t.periodNumber === selectedPeriod)}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onBack={() => setSelectedPeriod(null)}
          />
        ) : (
          /* Main View */
          <>
            {/* Budget Form - Always visible on desktop, conditional on mobile */}
            <div className={`mb-6 ${view !== 'form' ? 'hidden md:block' : ''}`}>
              <BudgetForm
                config={config}
                onChange={setConfig}
                onBalanceUpdate={handleBalanceUpdate}
                calculatedBaseline={calculatedBaseline}
                recordedPeriodsCount={recordedPeriodsCount}
              />
            </div>

            {/* Goal Timeline Summary */}
            {goalDates && config.savingsGoal > 0 && (
              <div className={`bg-white rounded-xl border border-neutral-200/60 shadow-sm p-5 mb-6 ${view === 'form' ? 'hidden md:block' : ''}`}>
                <h3 className="text-base font-semibold text-primary-800 mb-4">
                  Goal Timeline: <span className="text-accent-600 tabular-nums">{formatCurrency(config.savingsGoal)}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {goalDates.dateBeforeExpenses ? (
                    <div className="relative overflow-hidden rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100/50 p-4">
                      <div className="absolute top-0 right-0 w-16 h-16 -mr-4 -mt-4 bg-primary-200/30 rounded-full blur-xl"></div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-1">
                        Before Expenses
                      </p>
                      <p className="text-lg font-bold text-primary-900 tabular-nums">
                        {formatDate(goalDates.dateBeforeExpenses)}
                      </p>
                      <p className="text-xs text-primary-500 mt-1">
                        (ignoring all expenses)
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                        Before Expenses
                      </p>
                      <p className="text-lg font-bold text-neutral-400">
                        Not achievable
                      </p>
                    </div>
                  )}

                  {goalDates.dateAfterExpenses ? (
                    <div className="relative overflow-hidden rounded-xl border border-warning-200 bg-gradient-to-br from-warning-50 to-warning-100/50 p-4">
                      <div className="absolute top-0 right-0 w-16 h-16 -mr-4 -mt-4 bg-warning-200/30 rounded-full blur-xl"></div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-warning-600 mb-1">
                        After Expenses
                      </p>
                      <p className="text-lg font-bold text-warning-700 tabular-nums">
                        {formatDate(goalDates.dateAfterExpenses)}
                      </p>
                      <p className="text-xs text-warning-600 mt-1">
                        (after recurring expenses)
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                        After Expenses
                      </p>
                      <p className="text-lg font-bold text-neutral-400">
                        Not achievable
                      </p>
                    </div>
                  )}

                  {goalDates.dateAfterBaseline ? (
                    <div className="relative overflow-hidden rounded-xl border-2 border-accent-300 bg-gradient-to-br from-accent-50 to-accent-100/50 p-4 ring-1 ring-accent-400/20">
                      <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 bg-accent-300/30 rounded-full blur-2xl"></div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-accent-700 mb-1">
                        After All Spending
                      </p>
                      <p className="text-xl font-bold text-accent-800 tabular-nums">
                        {formatDate(goalDates.dateAfterBaseline)}
                      </p>
                      <p className="text-sm font-medium text-accent-600 mt-1">
                        {goalDates.daysToGoal > 0
                          ? `${goalDates.daysToGoal} days (${goalDates.periodsToGoal} pay periods)`
                          : 'Goal already reached!'}
                      </p>
                    </div>
                  ) : (
                    <div className="relative overflow-hidden rounded-xl border-2 border-danger-200 bg-gradient-to-br from-danger-50 to-danger-100/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-danger-600 mb-1">
                        After All Spending
                      </p>
                      <p className="text-lg font-bold text-danger-700">
                        Not achievable
                      </p>
                      <p className="text-xs text-danger-500 mt-1">
                        Expenses exceed income
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* View Toggle - Desktop only */}
            {projection.length > 0 && (
              <div className={`hidden md:flex justify-center mb-4 ${view === 'form' ? 'md:hidden' : ''}`}>
                <div className="inline-flex rounded-lg bg-neutral-100 p-1 gap-1">
                  <button
                    onClick={() => setView('chart')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      view === 'chart'
                        ? 'bg-white text-primary-800 shadow-sm'
                        : 'text-neutral-600 hover:text-primary-700'
                    }`}
                  >
                    Chart
                  </button>
                  <button
                    onClick={() => setView('table')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      view === 'table'
                        ? 'bg-white text-primary-800 shadow-sm'
                        : 'text-neutral-600 hover:text-primary-700'
                    }`}
                  >
                    Table
                  </button>
                </div>
              </div>
            )}

            {/* Projection Display - single chart instance to avoid hidden container issues */}
            {projection.length > 0 && (
              <>
                {/* Chart - show when: mobile+chart view, OR desktop+not table view */}
                {(view === 'chart' || (isDesktop && view !== 'table')) && (
                  <ProjectionChart data={projection} savingsGoal={config.savingsGoal} />
                )}

                {/* Table view */}
                {view === 'table' && (
                  <ProjectionTable
                    data={projection}
                    savingsGoal={config.savingsGoal}
                    onSelectPeriod={setSelectedPeriod}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Footer - hidden on mobile due to bottom nav */}
      <footer className="hidden md:block bg-white border-t border-neutral-200 mt-8">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6">
          <p className="text-center text-xs text-neutral-400">
            Data auto-saved locally
          </p>
        </div>
      </footer>

      {/* Bottom Navigation - Mobile only */}
      {selectedPeriod === null && (
        <BottomNav view={view} onViewChange={setView} />
      )}

      {/* Toast notification */}
      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}

export default App;
