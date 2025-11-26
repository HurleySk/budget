import { addDays, addWeeks, differenceInDays, parseISO } from 'date-fns';
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
 */
export function generateProjection(config: BudgetConfig): ProjectionEntry[] {
  const entries: ProjectionEntry[] = [];
  const expensesPerPeriod = getExpensesPerPeriod(
    config.recurringExpenses,
    config.paycheckFrequency
  );

  // Track balance in each scenario
  let balanceAfterIncome = config.currentBalance;
  let balanceAfterExpenses = config.currentBalance;
  let balanceAfterBaseline = config.currentBalance;

  // Track when goal is reached
  let goalReachedPeriod: number | null = null;

  // Max periods: 5 years worth (generous estimate)
  const maxPeriods = 260; // ~5 years of weekly pay

  // Generate actual pay dates
  const payDates = generatePayDates(config, maxPeriods);

  for (let period = 0; period < payDates.length; period++) {
    const periodDate = payDates[period];

    // Add income
    balanceAfterIncome += config.paycheckAmount;

    // After expenses (income minus recurring expenses)
    balanceAfterExpenses = balanceAfterIncome - expensesPerPeriod;

    // After baseline (all spending)
    balanceAfterBaseline = balanceAfterExpenses - config.baselineSpendPerPeriod;

    entries.push({
      date: periodDate,
      periodNumber: period + 1,
      income: config.paycheckAmount,
      expenses: expensesPerPeriod,
      baselineSpend: config.baselineSpendPerPeriod,
      balanceAfterIncome,
      balanceAfterExpenses,
      balanceAfterBaseline,
    });

    // Check if goal is reached (using most conservative scenario)
    if (goalReachedPeriod === null && balanceAfterBaseline >= config.savingsGoal) {
      goalReachedPeriod = period;
    }

    // Continue for 3 more months after goal is reached
    if (goalReachedPeriod !== null) {
      const periodsPerMonth = FREQ_TO_MONTHLY[config.paycheckFrequency];
      const extraPeriods = Math.ceil(periodsPerMonth * 3);
      if (period >= goalReachedPeriod + extraPeriods) {
        break;
      }
    }

    // Update running balances for next period
    balanceAfterIncome = balanceAfterBaseline;
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

  // Handle case where goal is already met
  if (config.currentBalance >= config.savingsGoal) {
    const today = new Date();
    return {
      dateBeforeExpenses: today,
      dateAfterExpenses: today,
      dateAfterBaseline: today,
      periodsToGoal: 0,
      daysToGoal: 0,
    };
  }

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
