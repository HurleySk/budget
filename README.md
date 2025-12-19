# Budget Tracker

A financial projection tool that forecasts cash flow based on income, recurring expenses, and spending habits. See when you'll reach your savings goals by projecting your balance across pay periods.

## Features

### Projection Engine
- Balance projections across pay periods
- Pay frequencies: weekly, bi-weekly, semi-monthly, monthly
- Weekend handling (Friday before or Monday after)
- Configurable semi-monthly pay days

### Expense & Transaction Tracking
- Recurring expenses with flexible frequencies (weekly to yearly)
- Ad-hoc one-time transactions per period
- Baseline spending estimate for discretionary costs

### Three Balance Views
- **After Pay** - Balance after paycheck received
- **After Bills** - Balance after recurring expenses
- **After All** - Balance after baseline spending (most conservative)

### Savings
- Goal tracking with projected reach date
- **Auto-sweep** - Automatically save excess above goal threshold
- Configurable trigger: after pay, after bills, or after all spending
- Per-period and cumulative savings tracking

### Period Management
- Confirm actual balances at period end
- Variance tracking with categorized explanations
- Calculated baseline from confirmed period history
- Historical period records

### Views
- **Dashboard** - Goal progress, current period summary
- **Timeline** - Period-by-period breakdown with inline editing
- **Settings** - Income, expenses, savings configuration

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Recharts
- date-fns

## Getting Started

```bash
npm install
npm run dev

# Access from other devices on network:
npm run dev -- --host 0.0.0.0
```

Data is stored in `data/budget.json`.

## Build

```bash
npm run build
```
