# Budget Tracker - Architecture Documentation

## Overview

A React/TypeScript web app for personal budgeting with local JSON storage. Users enter income, expenses, baseline spend, and savings goals; the app projects when goals will be achieved.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Date Handling**: date-fns
- **Storage**: localStorage (JSON)

## Project Structure

```
budget/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Main app, state, layout
│   ├── types.ts              # All TypeScript interfaces
│   ├── calculations.ts       # Pure functions for projections
│   ├── storage.ts            # localStorage save/load
│   ├── index.css             # Tailwind CSS imports
│   └── components/
│       ├── BudgetForm.tsx       # All input fields in one form
│       ├── ProjectionChart.tsx  # Recharts line chart
│       └── ProjectionTable.tsx  # Detailed table view
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── postcss.config.js
```

## Data Models

### Core Types (`src/types.ts`)

```typescript
type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
type ExpenseFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  frequency: ExpenseFrequency;
}

interface BudgetConfig {
  currentBalance: number;
  paycheckAmount: number;
  paycheckFrequency: PayFrequency;
  recurringExpenses: RecurringExpense[];
  baselineSpendPerPeriod: number;
  savingsGoal: number;
}
```

### Projection Types

```typescript
interface ProjectionEntry {
  date: Date;
  periodNumber: number;
  income: number;
  expenses: number;
  baselineSpend: number;
  balanceAfterIncome: number;
  balanceAfterExpenses: number;
  balanceAfterBaseline: number;
}

interface GoalProjection {
  dateBeforeExpenses: Date | null;    // Ignoring all expenses
  dateAfterExpenses: Date | null;     // After recurring expenses only
  dateAfterBaseline: Date | null;     // After all spending
  periodsToGoal: number;
  daysToGoal: number;
}
```

## Core Calculations (`src/calculations.ts`)

### Frequency Normalization

All frequencies are converted to monthly amounts for consistent calculations:

| Frequency    | Monthly Multiplier |
|-------------|-------------------|
| Weekly      | 52/12 (~4.33)     |
| Bi-weekly   | 26/12 (~2.17)     |
| Semi-monthly| 2                 |
| Monthly     | 1                 |
| Quarterly   | 1/3               |
| Yearly      | 1/12              |

### Projection Engine

The `generateProjection()` function:

1. Starts with current balance
2. For each pay period:
   - Adds paycheck amount
   - Subtracts pro-rated recurring expenses for that period
   - Subtracts baseline spend
   - Records balance at each stage
3. Continues until goal is reached + 3 months (max 5 years safety limit)

### Goal Calculation

The `calculateGoalDates()` function finds when balance crosses the goal threshold under three scenarios:

1. **Before Expenses**: Balance after income only (best case)
2. **After Expenses**: Balance after recurring expenses
3. **After Baseline**: Balance after all spending (most realistic)

## Component Architecture

### App.tsx

Main component that:
- Manages all state with `useState<BudgetConfig>`
- Loads from localStorage on mount
- Auto-saves on config changes
- Calculates projection using `useMemo`
- Renders form, goal summary, and chart/table

### BudgetForm.tsx

Single form handling all inputs:
- Current Balance
- Savings Goal
- Paycheck Amount + Frequency
- Baseline Spend per Period
- Recurring Expenses (CRUD operations)

### ProjectionChart.tsx

Recharts-based visualization:
- Line chart with three balance lines
- Goal reference line
- Responsive container
- Hover tooltips

### ProjectionTable.tsx

Detailed tabular view:
- Period-by-period breakdown
- Highlights goal achievement row
- Shows negative balance warnings

## Storage (`src/storage.ts`)

Simple localStorage wrapper:

```typescript
const STORAGE_KEY = 'budget-app-config';

saveBudget(config)   // Saves to localStorage
loadBudget()         // Loads from localStorage, returns null if not found
clearBudget()        // Removes from localStorage
```

Data is stored as JSON and persists across browser sessions.

## UI/UX Design

### Single Page Dashboard

All functionality is accessible from one page:
- Input section at top
- Goal timeline summary in the middle
- Chart/Table toggle for visualization

### Real-time Updates

Projections recalculate instantly as user types, providing immediate feedback.

### Three Scenarios

Goal dates are shown for three scenarios to help users understand the impact of different spending levels:
- Best case (ignoring expenses)
- After fixed expenses
- After all spending (realistic)

## Future Enhancements

### Actual Tracking Feature

To add the "calculated baseline" feature:

1. Add `PayPeriod` type:
```typescript
interface PayPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  actualStartBalance?: number;
  actualEndBalance?: number;
  status: 'future' | 'current' | 'completed';
}
```

2. Add `payPeriodHistory` array to BudgetConfig
3. Create UI for recording actual balances each period
4. Calculate average/median baseline from completed periods:
```typescript
function calculateActualBaseline(periods: PayPeriod[]): {
  average: number;
  median: number;
}
```
5. Show comparison: user-entered vs calculated baseline

### Potential Improvements

- Multiple savings goals
- Expense categories
- Data export/import
- PWA support for offline use
- Dark mode

## Running the App

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## File Summaries

| File | Purpose |
|------|---------|
| `src/types.ts` | TypeScript interfaces and default values |
| `src/calculations.ts` | Pure functions for projection math |
| `src/storage.ts` | localStorage persistence layer |
| `src/App.tsx` | Main app component and state management |
| `src/components/BudgetForm.tsx` | Input form for all budget data |
| `src/components/ProjectionChart.tsx` | Recharts line chart visualization |
| `src/components/ProjectionTable.tsx` | Table view of projections |
