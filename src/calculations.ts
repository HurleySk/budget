import { addDays, addWeeks, addMonths, addYears, differenceInDays, parseISO, startOfDay, isBefore, isAfter } from 'date-fns';
import type {
  BudgetConfig,
  PayFrequency,
  ExpenseFrequency,
  RecurringExpense,
  ProjectionEntry,
  GoalProjection,
  WeekendHandling,
  SemiMonthlyConfig,
  MonthlyConfig,
  ExpenseOccurrence,
  PeriodSpendEntry,
} from './types';

// Convert frequency to monthly multiplier
const FREQ_TO_MONTHLY: Record<PayFrequency | ExpenseFrequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

/**
 * Adjust date if it falls on weekend
 * @param date The date to check
 * @param handling How to handle weekends: 'before' = Friday, 'after' = Monday, 'none' = no change
 */
export function adjustForWeekend(date: Date, handling: WeekendHandling): Date {
  if (handling === 'none') return date;

  const day = date.getDay(); // 0 = Sunday, 6 = Saturday

  if (day === 0) {
    // Sunday
    return handling === 'before' ? addDays(date, -2) : addDays(date, 1);
  }
  if (day === 6) {
    // Saturday
    return handling === 'before' ? addDays(date, -1) : addDays(date, 2);
  }

  return date;
}

/**
 * Get the two pay days for a given month in semi-monthly schedule
 */
function getSemiMonthlyPayDaysForMonth(
  year: number,
  month: number,
  config: SemiMonthlyConfig,
  weekendHandling: WeekendHandling
): Date[] {
  // Get last day of the month
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  // First pay day
  const firstDayNum = Math.min(config.firstPayDay, lastDayOfMonth);
  const firstDay = new Date(year, month, firstDayNum);

  // Second pay day (handle "last day of month" by capping at actual last day)
  const secondDayNum = Math.min(config.secondPayDay, lastDayOfMonth);
  const secondDay = new Date(year, month, secondDayNum);

  // Adjust for weekends and sort
  const days = [
    adjustForWeekend(firstDay, weekendHandling),
    adjustForWeekend(secondDay, weekendHandling),
  ].sort((a, b) => a.getTime() - b.getTime());

  return days;
}

/**
 * Get the pay day for a given month in monthly schedule
 */
function getMonthlyPayDayForMonth(
  year: number,
  month: number,
  config: MonthlyConfig,
  weekendHandling: WeekendHandling
): Date {
  // Get last day of the month
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  // Pay day (handle "last day of month" by capping at actual last day)
  const payDayNum = Math.min(config.payDay, lastDayOfMonth);
  const payDay = new Date(year, month, payDayNum);

  return adjustForWeekend(payDay, weekendHandling);
}

/**
 * Generate array of pay dates starting from the next pay date
 */
export function generatePayDates(
  config: BudgetConfig,
  maxCount: number
): Date[] {
  const dates: Date[] = [];
  const startDate = parseISO(config.nextPayDate);
  const { paycheckFrequency, weekendHandling, semiMonthlyConfig, monthlyConfig } = config;

  if (paycheckFrequency === 'semimonthly') {
    // Semi-monthly: use actual calendar days
    let currentYear = startDate.getFullYear();
    let currentMonth = startDate.getMonth();

    // Start from the month of the next pay date
    while (dates.length < maxCount) {
      const payDays = getSemiMonthlyPayDaysForMonth(
        currentYear,
        currentMonth,
        semiMonthlyConfig,
        weekendHandling
      );

      for (const payDay of payDays) {
        // Only include dates on or after the start date
        if (payDay >= startDate && dates.length < maxCount) {
          dates.push(payDay);
        }
      }

      // Move to next month
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
  } else if (paycheckFrequency === 'monthly') {
    // Monthly: use calendar-based logic with day-of-month
    let currentYear = startDate.getFullYear();
    let currentMonth = startDate.getMonth();

    while (dates.length < maxCount) {
      const payDay = getMonthlyPayDayForMonth(
        currentYear,
        currentMonth,
        monthlyConfig,
        weekendHandling
      );

      // Only include dates on or after the start date
      if (payDay >= startDate) {
        dates.push(payDay);
      }

      // Move to next month
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
  } else {
    // Weekly, bi-weekly: use fixed intervals from start date
    let currentDate = startDate;

    for (let i = 0; i < maxCount; i++) {
      // Adjust for weekend
      const adjustedDate = adjustForWeekend(currentDate, weekendHandling);
      dates.push(adjustedDate);

      // Move to next pay date
      switch (paycheckFrequency) {
        case 'weekly':
          currentDate = addWeeks(currentDate, 1);
          break;
        case 'biweekly':
          currentDate = addWeeks(currentDate, 2);
          break;
      }
    }
  }

  return dates;
}

/**
 * Adjust day of month to fit within a given month (handles 31st in Feb, etc.)
 */
function adjustDayForMonth(year: number, month: number, originalDay: number): number {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(originalDay, lastDayOfMonth);
}

/**
 * Get the next occurrence of an expense on or after a start date
 */
function getFirstOccurrenceOnOrAfter(
  expense: RecurringExpense,
  startDate: Date
): Date {
  const anchorDate = startOfDay(parseISO(expense.nextDueDate));
  const start = startOfDay(startDate);
  const originalDay = anchorDate.getDate();

  // If anchor is on or after start, use it directly
  if (!isBefore(anchorDate, start)) {
    return anchorDate;
  }

  // Calculate forward from anchor until we reach/pass startDate
  let current = anchorDate;

  while (isBefore(current, start)) {
    switch (expense.frequency) {
      case 'weekly':
        current = addWeeks(current, 1);
        break;
      case 'biweekly':
        current = addWeeks(current, 2);
        break;
      case 'monthly': {
        const nextMonth = addMonths(current, 1);
        const adjustedDay = adjustDayForMonth(nextMonth.getFullYear(), nextMonth.getMonth(), originalDay);
        current = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), adjustedDay);
        break;
      }
      case 'quarterly': {
        const nextQuarter = addMonths(current, 3);
        const adjustedDay = adjustDayForMonth(nextQuarter.getFullYear(), nextQuarter.getMonth(), originalDay);
        current = new Date(nextQuarter.getFullYear(), nextQuarter.getMonth(), adjustedDay);
        break;
      }
      case 'yearly': {
        const nextYear = addYears(current, 1);
        const adjustedDay = adjustDayForMonth(nextYear.getFullYear(), nextYear.getMonth(), originalDay);
        current = new Date(nextYear.getFullYear(), nextYear.getMonth(), adjustedDay);
        break;
      }
    }
  }

  return current;
}

/**
 * Calculate the next occurrence date based on frequency
 */
function getNextOccurrence(
  currentDate: Date,
  frequency: ExpenseFrequency,
  originalDayOfMonth: number
): Date {
  switch (frequency) {
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'biweekly':
      return addWeeks(currentDate, 2);
    case 'monthly': {
      const nextMonth = addMonths(currentDate, 1);
      const adjustedDay = adjustDayForMonth(nextMonth.getFullYear(), nextMonth.getMonth(), originalDayOfMonth);
      return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), adjustedDay);
    }
    case 'quarterly': {
      const nextQuarter = addMonths(currentDate, 3);
      const adjustedDay = adjustDayForMonth(nextQuarter.getFullYear(), nextQuarter.getMonth(), originalDayOfMonth);
      return new Date(nextQuarter.getFullYear(), nextQuarter.getMonth(), adjustedDay);
    }
    case 'yearly': {
      const nextYear = addYears(currentDate, 1);
      const adjustedDay = adjustDayForMonth(nextYear.getFullYear(), nextYear.getMonth(), originalDayOfMonth);
      return new Date(nextYear.getFullYear(), nextYear.getMonth(), adjustedDay);
    }
  }
}

/**
 * Generate all expense occurrences within a date range
 */
export function generateExpenseOccurrences(
  expenses: RecurringExpense[],
  rangeStart: Date,
  rangeEnd: Date
): ExpenseOccurrence[] {
  const occurrences: ExpenseOccurrence[] = [];
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);

  for (const expense of expenses) {
    // Skip expenses without nextDueDate (shouldn't happen, but be safe)
    if (!expense.nextDueDate) continue;

    // Find the first occurrence on or after rangeStart
    let currentDate = getFirstOccurrenceOnOrAfter(expense, start);
    const originalDay = parseISO(expense.nextDueDate).getDate();

    // Generate all occurrences within the range
    while (!isAfter(currentDate, end)) {
      occurrences.push({
        expenseId: expense.id,
        name: expense.name,
        amount: expense.amount,
        date: currentDate,
      });

      currentDate = getNextOccurrence(currentDate, expense.frequency, originalDay);
    }
  }

  // Sort by date, then by expense name for consistent ordering
  return occurrences.sort((a, b) => {
    const dateCompare = a.date.getTime() - b.date.getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get expenses that fall between two dates (for a pay period)
 */
function getExpensesBetweenDates(
  occurrences: ExpenseOccurrence[],
  periodStart: Date,
  periodEnd: Date
): ExpenseOccurrence[] {
  const start = startOfDay(periodStart);
  const end = startOfDay(periodEnd);

  return occurrences.filter((occ) => {
    const occDate = startOfDay(occ.date);
    return !isBefore(occDate, start) && !isAfter(occDate, end);
  });
}

/**
 * Calculate monthly expense total from all recurring expenses
 */
export function getMonthlyExpenseTotal(expenses: RecurringExpense[]): number {
  return expenses.reduce((sum, expense) => {
    return sum + expense.amount * FREQ_TO_MONTHLY[expense.frequency];
  }, 0);
}

/**
 * Calculate expenses per pay period
 */
export function getExpensesPerPeriod(
  expenses: RecurringExpense[],
  payFrequency: PayFrequency
): number {
  const monthlyExpenses = getMonthlyExpenseTotal(expenses);
  const periodsPerMonth = FREQ_TO_MONTHLY[payFrequency];
  return monthlyExpenses / periodsPerMonth;
}

/**
 * Calculate net savings per pay period (income - expenses - baseline)
 */
export function getNetPerPeriod(config: BudgetConfig): number {
  const expensesPerPeriod = getExpensesPerPeriod(
    config.recurringExpenses,
    config.paycheckFrequency
  );
  return config.paycheckAmount - expensesPerPeriod - config.baselineSpendPerPeriod;
}

/**
 * Generate projection entries until goal is reached + 3 months
 * Max projection: 5 years to prevent infinite loops
 *
 * Includes a "period 0" entry for today → next paycheck (partial period).
 * Expenses are calculated based on actual due dates, not averaged.
 *
 * @param config The budget configuration
 * @param baselineOverride Optional baseline to use instead of config.baselineSpendPerPeriod
 */
export function generateProjection(config: BudgetConfig, baselineOverride?: number): ProjectionEntry[] {
  const entries: ProjectionEntry[] = [];
  const effectiveBaseline = baselineOverride ?? config.baselineSpendPerPeriod;

  // Max periods: 5 years worth (generous estimate)
  const maxPeriods = 260; // ~5 years of weekly pay

  // Generate actual pay dates and filter out any in the past
  const today = startOfDay(new Date());
  const allPayDates = generatePayDates(config, maxPeriods);
  const futurePayDates = allPayDates.filter(date => !isBefore(startOfDay(date), today));

  if (futurePayDates.length === 0) return entries;

  // Calculate period 0 start date
  // Priority: budgetStartDate (immutable) > currentBalanceAsOf > today
  // budgetStartDate is the original tracking start date and should never change
  const period0Start = config.budgetStartDate
    ? parseISO(config.budgetStartDate)
    : config.currentBalanceAsOf
      ? parseISO(config.currentBalanceAsOf)
      : today;

  // Pre-generate all expense occurrences for the entire projection range
  const projectionEnd = addMonths(futurePayDates[futurePayDates.length - 1], 1);
  const allExpenseOccurrences = generateExpenseOccurrences(
    config.recurringExpenses,
    period0Start,  // Start from balance entry date to catch all relevant expenses
    projectionEnd
  );

  // Track balances - start from current balance
  let balanceAfterIncome = config.currentBalance;
  let balanceAfterExpenses = config.currentBalance;
  let balanceAfterBaseline = config.currentBalance;

  // Track when goal is reached
  let goalReachedPeriod: number | null = null;

  // === PERIOD 0: Balance Entry Date → Next Paycheck (partial period) ===
  // period0Start is already calculated above (from currentBalanceAsOf or today)
  const nextPayDate = futurePayDates[0];
  const daysUntilNextPay = differenceInDays(nextPayDate, period0Start);

  // Only add partial period if there are days before next paycheck
  if (daysUntilNextPay > 0) {
    // Get expenses between balance entry date and next paycheck (exclusive of pay date)
    const partialPeriodExpenses = getExpensesBetweenDates(
      allExpenseOccurrences,
      period0Start,
      addDays(nextPayDate, -1)
    );
    const partialExpenseTotal = partialPeriodExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Get ad-hoc transactions for period 0
    const adHocTransactions = config.adHocTransactions ?? [];
    const period0AdHocs = adHocTransactions.filter(t => t.periodNumber === 0);
    const period0AdHocIncome = period0AdHocs.filter(t => t.isIncome).reduce((sum, t) => sum + t.amount, 0);
    const period0AdHocExpense = period0AdHocs.filter(t => !t.isIncome).reduce((sum, t) => sum + t.amount, 0);

    // Calculate balances for partial period (no paycheck income)
    balanceAfterIncome = config.currentBalance + period0AdHocIncome;
    balanceAfterExpenses = balanceAfterIncome - partialExpenseTotal - period0AdHocExpense;
    balanceAfterBaseline = balanceAfterExpenses - effectiveBaseline;

    entries.push({
      date: today,
      periodNumber: 0,  // Special "current" period
      income: 0,
      expenses: partialExpenseTotal,
      expenseDetails: partialPeriodExpenses,
      adHocIncome: period0AdHocIncome,
      adHocExpenses: period0AdHocExpense,
      adHocDetails: period0AdHocs,
      baselineSpend: effectiveBaseline,
      balanceAfterIncome,
      balanceAfterExpenses,
      balanceAfterBaseline,
    });

    // Check if goal already reached
    if (balanceAfterBaseline >= config.savingsGoal) {
      goalReachedPeriod = 0;
    }
  }

  // === PERIODS 1+: Regular pay periods ===
  for (let i = 0; i < futurePayDates.length; i++) {
    const periodDate = futurePayDates[i];
    const periodNumber = i + 1;

    // Period boundaries: this payday (inclusive) to next payday (exclusive)
    const periodStart = periodDate;
    const periodEnd = i < futurePayDates.length - 1
      ? addDays(futurePayDates[i + 1], -1)
      : addMonths(periodDate, 1);

    // Get recurring expenses for this period
    const periodExpenses = getExpensesBetweenDates(
      allExpenseOccurrences,
      periodStart,
      periodEnd
    );
    const recurringExpenseTotal = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Get ad-hoc transactions for this period
    const adHocTransactions = config.adHocTransactions ?? [];
    const periodAdHocs = adHocTransactions.filter(t => t.periodNumber === periodNumber);
    const adHocIncomeTotal = periodAdHocs.filter(t => t.isIncome).reduce((sum, t) => sum + t.amount, 0);
    const adHocExpenseTotal = periodAdHocs.filter(t => !t.isIncome).reduce((sum, t) => sum + t.amount, 0);

    // Add income (paycheck + ad-hoc income)
    balanceAfterIncome = balanceAfterBaseline + config.paycheckAmount + adHocIncomeTotal;

    // After expenses
    const totalExpenses = recurringExpenseTotal + adHocExpenseTotal;
    balanceAfterExpenses = balanceAfterIncome - totalExpenses;

    // After baseline
    balanceAfterBaseline = balanceAfterExpenses - effectiveBaseline;

    entries.push({
      date: periodDate,
      periodNumber,
      income: config.paycheckAmount,
      expenses: recurringExpenseTotal,
      expenseDetails: periodExpenses,
      adHocIncome: adHocIncomeTotal,
      adHocExpenses: adHocExpenseTotal,
      adHocDetails: periodAdHocs,
      baselineSpend: effectiveBaseline,
      balanceAfterIncome,
      balanceAfterExpenses,
      balanceAfterBaseline,
    });

    // Check if goal is reached
    if (goalReachedPeriod === null && balanceAfterBaseline >= config.savingsGoal) {
      goalReachedPeriod = i;
    }

    // Continue for 3 more months after goal is reached
    if (goalReachedPeriod !== null) {
      const periodsPerMonth = FREQ_TO_MONTHLY[config.paycheckFrequency];
      const extraPeriods = Math.ceil(periodsPerMonth * 3);
      if (i >= goalReachedPeriod + extraPeriods) {
        break;
      }
    }
  }

  return entries;
}

/**
 * Find when balance crosses goal threshold in each scenario
 */
export function calculateGoalDates(
  config: BudgetConfig,
  projection: ProjectionEntry[]
): GoalProjection {
  let dateBeforeExpenses: Date | null = null;
  let dateAfterExpenses: Date | null = null;
  let dateAfterBaseline: Date | null = null;
  let periodsToGoal = 0;

  // Handle case where no savings goal is set
  if (config.savingsGoal <= 0) {
    return {
      dateBeforeExpenses: null,
      dateAfterExpenses: null,
      dateAfterBaseline: null,
      periodsToGoal: 0,
      daysToGoal: 0,
    };
  }

  for (const entry of projection) {
    // Skip partial period (Period 0) - goal should only be based on full periods
    if (entry.periodNumber === 0) continue;

    if (dateBeforeExpenses === null && entry.balanceAfterIncome >= config.savingsGoal) {
      dateBeforeExpenses = entry.date;
    }
    if (dateAfterExpenses === null && entry.balanceAfterExpenses >= config.savingsGoal) {
      dateAfterExpenses = entry.date;
    }
    if (dateAfterBaseline === null && entry.balanceAfterBaseline >= config.savingsGoal) {
      dateAfterBaseline = entry.date;
      periodsToGoal = entry.periodNumber;
    }
  }

  const today = new Date();
  const daysToGoal = dateAfterBaseline
    ? differenceInDays(dateAfterBaseline, today)
    : -1;

  return {
    dateBeforeExpenses,
    dateAfterExpenses,
    dateAfterBaseline,
    periodsToGoal,
    daysToGoal,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Calculate average baseline spend from period spend history.
 * Uses the trueSpend values recorded when periods transition.
 */
export function calculateAverageBaseline(
  periodSpendHistory: PeriodSpendEntry[],
  periodsToUse: number
): { average: number; count: number } | null {
  if (!periodSpendHistory || periodSpendHistory.length === 0) return null;

  // Use the most recent N periods
  const recentPeriods = periodSpendHistory.slice(-periodsToUse);

  // Only count non-negative true spend values
  const validSpends = recentPeriods
    .map(p => Math.max(0, p.trueSpend))  // Floor at 0 (user saved more than expected)
    .filter(s => !isNaN(s));

  if (validSpends.length === 0) return null;

  const average = validSpends.reduce((sum, s) => sum + s, 0) / validSpends.length;
  return {
    average: Math.round(average * 100) / 100,
    count: validSpends.length
  };
}

/**
 * Detect if a period transition has occurred (nextPayDate is in the past).
 */
export function detectPeriodTransition(
  config: BudgetConfig,
  today: Date
): { transitioned: boolean; passedPayDate: Date | null } {
  const todayStart = startOfDay(today);
  const nextPay = parseISO(config.nextPayDate);

  if (isBefore(nextPay, todayStart)) {
    return { transitioned: true, passedPayDate: nextPay };
  }

  return { transitioned: false, passedPayDate: null };
}

/**
 * Calculate true spend for a completed period.
 * trueSpend = expectedEnding - actualEnding (newStartingBalance)
 */
export function calculateTrueSpend(
  startingBalance: number,
  income: number,
  expenses: number,
  adHocIncome: number,
  adHocExpenses: number,
  newStartingBalance: number
): { trueSpend: number; expectedEnding: number } {
  const expectedEnding = startingBalance + income - expenses + adHocIncome - adHocExpenses;
  const trueSpend = expectedEnding - newStartingBalance;

  return {
    trueSpend: Math.round(trueSpend * 100) / 100,
    expectedEnding: Math.round(expectedEnding * 100) / 100
  };
}

/**
 * Handle period transition: update currentBalance and record true spend.
 * Should be called BEFORE advancePassedDates().
 *
 * @returns Updated config and transition info, or null if no transition needed
 */
export function handlePeriodTransition(
  config: BudgetConfig,
  today: Date,
  projection: ProjectionEntry[]
): {
  transitioned: boolean;
  config: BudgetConfig;
  newBalance: number;
  trueSpend: number;
} | null {
  const { transitioned, passedPayDate } = detectPeriodTransition(config, today);

  if (!transitioned || !passedPayDate) {
    return null;
  }

  const todayStr = today.toISOString().split('T')[0];

  // Check if user has already updated balance since the transition
  // (currentBalanceAsOf is on or after the passed pay date)
  const balanceAsOf = config.currentBalanceAsOf ? parseISO(config.currentBalanceAsOf) : null;
  const userAlreadyUpdated = balanceAsOf && !isBefore(balanceAsOf, passedPayDate);

  if (userAlreadyUpdated) {
    // User already entered a new starting balance - just ensure snapshot is set
    const newConfig: BudgetConfig = {
      ...config,
      periodStartSnapshot: {
        periodStartDate: config.currentBalanceAsOf!,
        balance: config.currentBalance,
      },
    };
    return {
      transitioned: true,
      config: newConfig,
      newBalance: config.currentBalance,
      trueSpend: 0,
    };
  }

  // User hasn't updated - auto-set to projected ending balance
  // Find period 0 (partial period) or period 1's ending
  const currentPeriod = projection.find(p => p.periodNumber === 0) ?? projection[0];
  if (!currentPeriod) {
    return null;
  }

  const newBalance = currentPeriod.balanceAfterBaseline;
  let trueSpend = 0;
  let periodSpendHistory = [...(config.periodSpendHistory ?? [])];

  // Record the period that just ended (if we have a snapshot)
  if (config.periodStartSnapshot) {
    // Get period data from projection for the period that ended
    // This is tricky - we need to calculate what the expected ending was
    const startingBalance = config.periodStartSnapshot.balance;

    // For period 0 (partial), use its data; otherwise sum up
    const income = currentPeriod.income;
    const expenses = currentPeriod.expenses;
    const adHocIncome = currentPeriod.adHocIncome;
    const adHocExpenses = currentPeriod.adHocExpenses;

    const result = calculateTrueSpend(
      startingBalance,
      income,
      expenses,
      adHocIncome,
      adHocExpenses,
      newBalance
    );

    trueSpend = result.trueSpend;

    // Since we're auto-projecting, trueSpend should be ~0 (or equal to baseline)
    // Actually, the expected ending already includes baseline deduction,
    // so if we use balanceAfterBaseline as newBalance, trueSpend ≈ baseline
    // This is a bit circular - let's record it anyway for consistency

    periodSpendHistory.push({
      periodEndDate: passedPayDate.toISOString().split('T')[0],
      startingBalance,
      expectedEnding: result.expectedEnding,
      actualEnding: newBalance,
      trueSpend: 0,  // Auto-projected, so we assume baseline was accurate
    });
  }

  // Prune old history entries beyond retention period
  const retentionDays = config.transitionHistoryRetentionDays ?? 7;
  const cutoffDate = addDays(today, -retentionDays);
  periodSpendHistory = periodSpendHistory.filter(entry => {
    const entryDate = parseISO(entry.periodEndDate);
    return !isBefore(entryDate, cutoffDate);
  });

  const newConfig: BudgetConfig = {
    ...config,
    currentBalance: newBalance,
    currentBalanceAsOf: todayStr,
    periodStartSnapshot: {
      periodStartDate: todayStr,
      balance: newBalance,
    },
    periodSpendHistory,
  };

  return {
    transitioned: true,
    config: newConfig,
    newBalance,
    trueSpend,
  };
}

/**
 * Check if we're in a new period compared to the last snapshot.
 * Used when user updates balance to determine if we should record true spend.
 */
export function isNewPeriod(
  config: BudgetConfig,
  currentPayDate: string
): boolean {
  if (!config.periodStartSnapshot) {
    return true;  // No snapshot means we're starting fresh
  }

  return config.periodStartSnapshot.periodStartDate !== currentPayDate;
}

/**
 * Advance any dates that have passed to their next occurrence.
 * Returns a new config if any dates were advanced, or null if no changes needed.
 */
export function advancePassedDates(
  config: BudgetConfig,
  today: Date
): BudgetConfig | null {
  let changed = false;
  let newConfig = { ...config };
  const todayStart = startOfDay(today);

  // 1. Advance nextPayDate if it's in the past (for all frequency types)
  const nextPay = parseISO(config.nextPayDate);
  if (isBefore(nextPay, todayStart)) {
    if (config.paycheckFrequency === 'weekly' || config.paycheckFrequency === 'biweekly') {
      // Weekly/biweekly: advance by interval
      let current = nextPay;
      const interval = config.paycheckFrequency === 'weekly' ? 1 : 2;
      while (isBefore(current, todayStart)) {
        current = addWeeks(current, interval);
      }
      newConfig.nextPayDate = current.toISOString().split('T')[0];
      changed = true;
    } else if (config.paycheckFrequency === 'semimonthly') {
      // Semimonthly: find next pay day on or after today
      let year = todayStart.getFullYear();
      let month = todayStart.getMonth();

      outerLoop:
      for (let i = 0; i < 3; i++) {
        const payDays = getSemiMonthlyPayDaysForMonth(
          year, month, config.semiMonthlyConfig, config.weekendHandling
        );
        for (const payDay of payDays) {
          if (!isBefore(payDay, todayStart)) {
            newConfig.nextPayDate = payDay.toISOString().split('T')[0];
            changed = true;
            break outerLoop;
          }
        }
        month++;
        if (month > 11) { month = 0; year++; }
      }
    } else if (config.paycheckFrequency === 'monthly') {
      // Monthly: find next pay day on or after today
      let year = todayStart.getFullYear();
      let month = todayStart.getMonth();

      for (let i = 0; i < 3; i++) {
        const payDay = getMonthlyPayDayForMonth(
          year, month, config.monthlyConfig, config.weekendHandling
        );
        if (!isBefore(payDay, todayStart)) {
          newConfig.nextPayDate = payDay.toISOString().split('T')[0];
          changed = true;
          break;
        }
        month++;
        if (month > 11) { month = 0; year++; }
      }
    }
  }

  // 2. Advance each recurring expense's nextDueDate if in the past
  // BUT only if the expense was due BEFORE currentBalanceAsOf (meaning it's already
  // accounted for in the balance). This prevents losing expense information when
  // dates advance but the user hasn't updated their balance yet.
  const balanceAsOf = config.currentBalanceAsOf
    ? startOfDay(parseISO(config.currentBalanceAsOf))
    : null;

  const updatedExpenses = config.recurringExpenses.map((expense) => {
    const dueDate = parseISO(expense.nextDueDate);
    // Only advance if:
    // 1. Due date is in the past (before today), AND
    // 2. Either no balanceAsOf is set (first time), OR the expense was due before
    //    the balance was entered (so it's already accounted for)
    const isInPast = isBefore(dueDate, todayStart);
    const alreadyAccountedFor = !balanceAsOf || isBefore(dueDate, balanceAsOf);

    if (isInPast && alreadyAccountedFor) {
      // Use existing logic to find next occurrence on or after today
      const nextDate = getFirstOccurrenceOnOrAfter(expense, todayStart);
      changed = true;
      return {
        ...expense,
        nextDueDate: nextDate.toISOString().split('T')[0],
      };
    }
    return expense;
  });

  if (changed) {
    newConfig.recurringExpenses = updatedExpenses;
    return newConfig;
  }
  return null;
}
