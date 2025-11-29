# Budget Tracker

A financial projection tool that forecasts your cash flow based on income, recurring expenses, and spending habits. See when you'll reach your savings goals by projecting your balance across pay periods.

## Features

- Real-time balance projections across multiple pay periods
- Multiple pay frequencies: weekly, bi-weekly, semi-monthly, monthly
- Recurring expense tracking with flexible frequencies (weekly to yearly)
- Ad-hoc transactions for one-time income/expenses
- Visual charts and detailed period breakdowns
- Goal tracking with milestone scenarios
- Actual balance tracking with calculated baseline averages
- Mobile-responsive design

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
```

## Build

```bash
npm run build
```

## Usage

1. Enter your current balance and paycheck details
2. Add recurring expenses (rent, subscriptions, etc.)
3. Set a baseline spend estimate for discretionary spending
4. Set a savings goal
5. View projections as charts or tables to see when you'll reach your goal

### Actual Balance Tracking

For more accurate projections, record your actual ending balance after each pay period:

1. Click on a past period in the table view
2. Enter your actual ending balance
3. After tracking 8 periods, a calculated baseline becomes available
4. Toggle "Use calculated baseline" to replace your estimate with real spending data
