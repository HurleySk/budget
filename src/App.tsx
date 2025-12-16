import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import type { BudgetConfig, AdHocTransaction } from './types';
import { DEFAULT_CONFIG } from './types';
import { generateProjection, formatCurrency, advancePassedDates, calculateAverageBaseline, handlePeriodTransition, calculateTrueSpend, getPendingConfirmationPeriod, calculateGoalDates } from './calculations';
import { saveBudget, loadBudget } from './storage';
import { PeriodDetail } from './components/PeriodDetail';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { PeriodConfirmationModal } from './components/PeriodConfirmationModal';
import { PeriodHistoryView } from './components/PeriodHistoryView';
import { Dashboard } from './components/Dashboard';
import { Timeline } from './components/Timeline';
import { Settings } from './components/Settings';
import { UpdateBalanceModal } from './components/UpdateBalanceModal';
import { AddTransactionModal } from './components/AddTransactionModal';
import { useCurrentDay } from './hooks/useCurrentDay';
import { generateUUID } from './utils/uuid';

type ViewMode = 'dashboard' | 'timeline' | 'settings';
type BalanceView = 'afterIncome' | 'afterExpenses' | 'afterBaseline';

function App() {
  const [config, setConfig] = useState<BudgetConfig>(DEFAULT_CONFIG);
  const [view, setView] = useState<ViewMode>('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Projections refreshed');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    periodEndDate: string;
    projectedBalance: number;
  } | null>(null);
  const [showUpdateBalanceModal, setShowUpdateBalanceModal] = useState(false);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [addTransactionDefaultPeriod, setAddTransactionDefaultPeriod] = useState<number | undefined>(undefined);
  const [timelineTargetPeriod, setTimelineTargetPeriod] = useState<number | undefined>(undefined);

  // Track current day - updates automatically at midnight
  const { currentDay, forceRefresh } = useCurrentDay();

  // Wrapped refresh handler that shows toast
  const handleRefresh = useCallback(() => {
    forceRefresh();
    setToastMessage('Projections refreshed');
    setShowToast(true);
  }, [forceRefresh]);

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

  // Check for pending period confirmations
  useEffect(() => {
    if (!isLoaded) return;

    const pending = getPendingConfirmationPeriod(config, new Date());
    if (pending?.needsConfirmation) {
      setPendingConfirmation({
        periodEndDate: pending.periodEndDate,
        projectedBalance: pending.projectedBalance,
      });
      setShowConfirmationModal(true);
    }
  }, [isLoaded, config, currentDay]);

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
        { ...txn, id: generateUUID() }
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

  // Handle starting balance update from Timeline (any started period)
  const handleUpdateStartingBalance = (periodNumber: number, balance: number) => {
    const period = projection.find(p => p.periodNumber === periodNumber);
    if (!period) return;

    // Set currentBalance to the entered value, with asOf date = period start
    setConfig(prev => ({
      ...prev,
      currentBalance: balance,
      currentBalanceAsOf: format(period.startDate, 'yyyy-MM-dd'),
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
          const startingBalance = snapshot.balanceBeforePaycheck + (snapshot.paycheckReceived ? currentPeriod.income : 0);
          const result = calculateTrueSpend(
            startingBalance,
            snapshot.paycheckReceived ? currentPeriod.income : 0,
            currentPeriod.expenses,
            currentPeriod.adHocIncome,
            currentPeriod.adHocExpenses,
            newBalance
          );

          // Record in history
          const historyEntry = {
            periodEndDate: snapshot.periodStartDate,
            startingBalance: startingBalance,
            expectedEnding: result.expectedEnding,
            actualEnding: newBalance,
            trueSpend: result.trueSpend,
          };

          return {
            ...prev,
            currentBalance: newBalance,
            currentBalanceAsOf: todayStr,
            periodSpendHistory: [...(prev.periodSpendHistory ?? []), historyEntry],
            periodStartSnapshot: { periodStartDate: todayStr, balanceBeforePaycheck: newBalance, paycheckReceived: false },
          };
        }
      }

      // Same period or first update - just update balance
      return {
        ...prev,
        currentBalance: newBalance,
        currentBalanceAsOf: todayStr,
        periodStartSnapshot: isFirstUpdate
          ? { periodStartDate: todayStr, balanceBeforePaycheck: newBalance, paycheckReceived: false }
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

  // Calculate goal projection dates
  const goalDates = useMemo(() => {
    return calculateGoalDates(config, projection);
  }, [config, projection]);

  // Period confirmation handlers
  const handlePeriodConfirm = useCallback((
    actualBalance: number,
    explanations: import('./types').VarianceExplanation[]
  ) => {
    setConfig(prev => {
      const periods = [...(prev.periods ?? [])];
      const pendingIndex = periods.findIndex(p => p.status === 'pending-confirmation');

      if (pendingIndex !== -1) {
        const period = periods[pendingIndex];
        const variance = period.projectedEndingBalance - actualBalance;

        periods[pendingIndex] = {
          ...period,
          endingBalance: actualBalance,
          variance,
          varianceExplanations: explanations,
          status: 'completed',
          confirmedAt: new Date().toISOString(),
        };
      }

      return {
        ...prev,
        periods,
        currentBalance: actualBalance,
        currentBalanceAsOf: new Date().toISOString().split('T')[0],
      };
    });

    setShowConfirmationModal(false);
    setPendingConfirmation(null);
  }, []);

  const handlePeriodDismiss = useCallback(() => {
    // Mark period as completed with projected balance (skip confirmation)
    setConfig(prev => {
      const periods = [...(prev.periods ?? [])];
      const pendingIndex = periods.findIndex(p => p.status === 'pending-confirmation');

      if (pendingIndex !== -1) {
        periods[pendingIndex] = {
          ...periods[pendingIndex],
          status: 'completed',
          confirmedAt: new Date().toISOString(),
        };
      }

      return { ...prev, periods };
    });

    setShowConfirmationModal(false);
    setPendingConfirmation(null);
  }, []);

  const handleRemindLater = useCallback(() => {
    setShowConfirmationModal(false);
    // Don't clear pendingConfirmation - will show again on next load/day change
  }, []);

  const handleStartNewCycle = useCallback((startDate: string, startingBalance: number) => {
    setConfig(prev => ({
      ...prev,
      budgetStartDate: startDate,
      currentBalance: startingBalance,
      currentBalanceAsOf: startDate,
      periodStartSnapshot: {
        periodStartDate: startDate,
        balanceBeforePaycheck: startingBalance,
        paycheckReceived: false,
      },
      // Keep existing periods as archive, or clear if desired
      // For now, we keep them but could add an "archived" flag
      periods: prev.periods ?? [],
      periodSpendHistory: [], // Clear old format
    }));
    setToastMessage('New budget cycle started');
    setShowToast(true);
  }, []);

  const handleUseCalculatedBaseline = useCallback(() => {
    if (calculatedBaseline) {
      setConfig(prev => ({
        ...prev,
        baselineSpendPerPeriod: Math.round(calculatedBaseline.average * 100) / 100,
      }));
      setToastMessage('Baseline updated to calculated average');
      setShowToast(true);
    }
  }, [calculatedBaseline]);

  const handleOpenAddTransaction = useCallback((periodNumber?: number) => {
    setAddTransactionDefaultPeriod(periodNumber);
    setShowAddTransactionModal(true);
  }, []);

  // Balance view preference (persisted in config)
  const balanceView: BalanceView = config.balanceView ?? 'afterBaseline';
  const handleBalanceViewChange = useCallback((view: BalanceView) => {
    setConfig(prev => ({ ...prev, balanceView: view }));
  }, []);

  const pendingPeriodForDashboard = useMemo(() => {
    return (config.periods ?? []).find(p => p.status === 'pending-confirmation') ?? null;
  }, [config.periods]);

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
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="w-10 h-10 rounded-lg bg-primary-700/50 hover:bg-primary-600/50 flex items-center justify-center transition-colors"
                title="Refresh projections"
              >
                <svg className="w-5 h-5 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setView('settings')}
                className="w-10 h-10 rounded-lg bg-primary-700/50 hover:bg-primary-600/50 flex items-center justify-center transition-colors"
                title="Settings"
              >
                <svg className="w-5 h-5 text-primary-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
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
        ) : showHistoryView ? (
          /* History View */
          <PeriodHistoryView
            periods={config.periods ?? []}
            onBack={() => setShowHistoryView(false)}
          />
        ) : view === 'dashboard' ? (
          /* Dashboard View */
          <Dashboard
            config={config}
            projection={projection}
            goalDates={goalDates}
            calculatedBaseline={calculatedBaseline}
            pendingPeriod={pendingPeriodForDashboard}
            balanceView={balanceView}
            onBalanceViewChange={handleBalanceViewChange}
            onAddExpense={() => handleOpenAddTransaction(0)}
            onConfirmPeriod={() => setShowConfirmationModal(true)}
            onViewTimeline={(periodNumber) => {
              setTimelineTargetPeriod(periodNumber);
              setView('timeline');
            }}
            onViewHistory={() => setShowHistoryView(true)}
            onUseCalculatedBaseline={handleUseCalculatedBaseline}
          />
        ) : view === 'timeline' ? (
          /* Timeline View */
          <Timeline
            projection={projection}
            historicalPeriods={config.periods ?? []}
            adHocTransactions={config.adHocTransactions ?? []}
            balanceView={balanceView}
            initialExpandedPeriod={timelineTargetPeriod}
            onBalanceViewChange={handleBalanceViewChange}
            onAddTransaction={handleOpenAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onUpdateStartingBalance={handleUpdateStartingBalance}
            onConfirmPeriod={() => setShowConfirmationModal(true)}
            onBack={() => {
              setTimelineTargetPeriod(undefined);
              setView('dashboard');
            }}
          />
        ) : view === 'settings' ? (
          /* Settings View */
          <Settings
            config={config}
            onChange={setConfig}
            onStartNewCycle={handleStartNewCycle}
            onViewHistory={() => setShowHistoryView(true)}
            onBack={() => setView('dashboard')}
          />
        ) : null}
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

      {/* Period Confirmation Modal */}
      {pendingConfirmation && (
        <PeriodConfirmationModal
          isOpen={showConfirmationModal}
          periodEndDate={pendingConfirmation.periodEndDate}
          projectedBalance={pendingConfirmation.projectedBalance}
          onConfirm={handlePeriodConfirm}
          onDismiss={handlePeriodDismiss}
          onRemindLater={handleRemindLater}
        />
      )}

      {/* Update Balance Modal */}
      <UpdateBalanceModal
        isOpen={showUpdateBalanceModal}
        currentBalance={config.currentBalance}
        onClose={() => setShowUpdateBalanceModal(false)}
        onSave={(newBalance: number) => {
          handleBalanceUpdate(newBalance);
          setShowUpdateBalanceModal(false);
        }}
      />

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={showAddTransactionModal}
        periods={projection}
        defaultPeriod={addTransactionDefaultPeriod}
        onClose={() => {
          setShowAddTransactionModal(false);
          setAddTransactionDefaultPeriod(undefined);
        }}
        onAdd={(transaction) => {
          handleAddTransaction(transaction);
          setShowAddTransactionModal(false);
          setAddTransactionDefaultPeriod(undefined);
        }}
      />
    </div>
  );
}

export default App;
