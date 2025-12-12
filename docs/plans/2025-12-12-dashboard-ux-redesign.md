# Dashboard UX Redesign

## Overview

Redesign the Budget Tracker UI to improve navigation, action discovery, and visual polish. The current 3-tab structure (Form/Chart/Table) buries actions and lacks a clear entry point. The new design introduces a Dashboard Hub with a Timeline view for period management.

## Problems Addressed

| Problem | Solution |
|---------|----------|
| Actions are buried (add expense, confirm period) | Quick actions on Dashboard, inline CTAs on Timeline |
| No clear entry point when opening app | Dashboard shows projection summary immediately |
| Confusing dual balance entry (update vs. new cycle) | Unified flow: "Update Balance" for normal use, "Reset Cycle" in Settings |
| Period 0 starts at "today" instead of period start | Bug fix: show actual period start date |
| Calculated baseline is hidden | Surface on Dashboard with "Use this?" option (3+ months data) |
| Timeline exists but data entry isn't obvious | Inline "+ Add transaction" and "Confirm balance" buttons per period |

## Information Architecture

### Before (Current)
```
[Form] [Chart] [Table]  ← 3 equal tabs, no hierarchy
```

### After (Dashboard Hub)
```
Dashboard (Home)
├── Health/projection summary
├── Quick actions (+ Expense, Update Balance)
├── Alerts (pending confirmations)
└── Entry to Timeline

Timeline
├── Period cards with inline data entry
├── Current period expanded
├── Pending periods highlighted
└── Completed periods collapsed

Settings
├── Income config (paycheck, frequency, next date)
├── Recurring expenses
├── Projection settings (baseline, goal)
└── Budget cycle management (reset)
```

### Navigation (Mobile Bottom Nav)
```
[ Home ]  [ Timeline ]  [ Settings ]
```

Chart becomes embedded (sparkline on Dashboard) or contextual (accessed from Timeline).

## Dashboard Design

### Layout
```
┌─────────────────────────────────────────┐
│  Budget Tracker              [Settings] │
├─────────────────────────────────────────┤
│                                         │
│     Projected balance                   │
│        $8,420                           │
│     by March 15                         │
│                                         │
│     ───〰️〰️〰️〰️〰️〰️───                │  ← Sparkline
│                                         │
│     Baseline: $320/period               │
│     (Avg actual: $285 · Use this?)      │  ← When 3+ months data
│                                         │
├─────────────────────────────────────────┤
│  [+ Expense]      [Update Balance]      │
├─────────────────────────────────────────┤
│  ⚠️ Period 3 needs confirmation         │  ← Alerts when relevant
├─────────────────────────────────────────┤
│  View Timeline →                        │
└─────────────────────────────────────────┘
```

### Key Elements

- **Hero = Projection**: "Where am I headed?" — shows projected balance at goal date
- **Sparkline**: Compact trajectory visualization
- **Baseline exposed**: Current estimate + calculated average with "Use this?" action
- **Quick actions**: Always visible, no hunting
- **Alerts**: Only shown when action needed

## Timeline Design

### Layout
```
┌─────────────────────────────────────────┐
│  ← Dashboard          Timeline          │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ PERIOD 4 (Current)         Active │  │
│  │ Jan 15 – Jan 28                   │  │
│  │                                   │  │
│  │ Starting: $2,340                  │  │
│  │ Income:   +$1,800                 │  │
│  │ Bills:    -$620                   │  │
│  │ Baseline: -$320                   │  │
│  │ ─────────────────                 │  │
│  │ Projected: $3,200                 │  │
│  │                                   │  │
│  │ [+ Add transaction]               │  │
│  │                                   │  │
│  │ Ad-hoc: (none yet)                │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ PERIOD 3             ⚠️ Confirm   │  │
│  │ Jan 1 – Jan 14                    │  │
│  │ Projected: $2,340                 │  │
│  │                                   │  │
│  │ [Confirm actual balance]          │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ PERIOD 2              ✓ Complete  │  │
│  │ Dec 18 – Dec 31                   │  │
│  │ Actual: $2,100 (vs $2,200 proj)   │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### Period States

| State | Visual | Actions |
|-------|--------|---------|
| Active | Blue accent, expanded | Add transaction |
| Pending confirmation | Amber badge, expanded | Confirm balance, add transaction |
| Complete | Muted, collapsed | View details (tap to expand) |

### Key Decisions

- Current + pending periods expand by default
- "+ Add transaction" button inside each card (contextual, obvious)
- "Confirm actual balance" as primary CTA for pending periods
- Completed periods show summary, tap to expand
- Period start dates are accurate (not "today")

## Settings Design

```
┌─────────────────────────────────────────┐
│  ← Dashboard          Settings          │
├─────────────────────────────────────────┤
│                                         │
│  INCOME                                 │
│  Paycheck amount      $1,800            │
│  Frequency            Bi-weekly         │
│  Next pay date        Jan 29            │
│                                         │
│  RECURRING EXPENSES                     │
│  Rent             $950    Monthly       │
│  Car insurance    $120    Monthly       │
│  Spotify          $12     Monthly       │
│  [+ Add expense]                        │
│                                         │
│  PROJECTION                             │
│  Baseline spend/period    $320          │
│  Savings goal             $10,000       │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  BUDGET CYCLE                           │
│  Started: November 1, 2024              │
│  [Reset & Start New Cycle]              │
│                                         │
└─────────────────────────────────────────┘
```

## Unified Balance Flow

### Problem
Two confusing entry points: "Update Balance" and "Start New Cycle"

### Solution

| Action | Location | Purpose |
|--------|----------|---------|
| Update Balance | Dashboard quick action | Normal use — sync with bank balance |
| Reset & Start New Cycle | Settings (bottom) | Edge case — fresh start, archives history |

### Update Balance Modal
```
┌─────────────────────────────────────────┐
│         Update Current Balance          │
├─────────────────────────────────────────┤
│  Current balance                        │
│  [ $2,340.00 ]                          │
│                                         │
│  As of                                  │
│  [ Jan 20, 2025 ]                       │
│                                         │
│  [Save]                                 │
└─────────────────────────────────────────┘
```

## Quick Action Flows

### "+ Expense" from Dashboard
- Opens modal with current period pre-selected
- Dropdown allows selecting different period
- Fields: Period, Description, Amount, Type (Expense/Income)

### "+ Add Transaction" from Timeline
- Same modal, period pre-selected based on which card was tapped
- Can still change period via dropdown

### Period Confirmation Modal
```
┌─────────────────────────────────────────┐
│       Confirm Period 3 Balance          │
│         Jan 1 – Jan 14                  │
├─────────────────────────────────────────┤
│  Projected ending balance: $2,340       │
│                                         │
│  What was your actual balance?          │
│  [ $2,240.00 ]                          │
│                                         │
│  Variance: -$100                        │
│                                         │
│  What caused the difference?            │
│  [ Unplanned grocery run ]              │
│                                         │
│  [Confirm Period]                       │
└─────────────────────────────────────────┘
```

## Visual Design: Calm & Confident

### Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary text | Slate 800 | #1e293b | Headers, important text |
| Secondary text | Slate 600 | #475569 | Body text, labels |
| Primary bg | Slate 100 | #f1f5f9 | Card backgrounds |
| Accent (positive) | Sage 600 | #4a7c59 | Income, positive values |
| Accent bg | Sage 100 | #e8f0ea | Subtle highlights |
| Page bg | Stone 50 | #fafaf9 | App background |
| Borders | Stone 200 | #e7e5e4 | Dividers, card borders |
| Attention | Amber 500 | #f59e0b | Pending items |
| Destructive | Rose 500 | #f43f5e | Delete, reset actions |

### Typography

| Use | Font | Weight | Size |
|-----|------|--------|------|
| Big numbers | DM Mono | Medium | 36-48px |
| Headings | DM Sans | Semibold | 18-24px |
| Body | DM Sans | Regular | 14-16px |
| Labels | DM Sans | Medium | 12px, uppercase |

### Spatial Rules

- Card radius: 16px
- Card padding: 20-24px
- Card shadows: `0 1px 3px rgba(0,0,0,0.05)`
- Section spacing: 24-32px
- Touch targets: 48px minimum

### Micro-interactions

| Element | Animation |
|---------|-----------|
| Card expand/collapse | 200ms ease-out |
| Button press | Scale 0.98 + darken |
| Modal open | 150ms fade + 8px slide up |
| Sparkline | Draw-on animation |
| Number changes | Count-up animation |

## Bug Fixes Required

1. **Period 0 start date**: Should show actual period start, not "today"

## Implementation Notes

- Dashboard becomes the default view (replaces Form as home)
- Chart view is demoted to embedded sparkline + contextual access
- Settings consolidates config that was previously in Form
- Timeline enhances existing Table/PeriodDetail functionality
- Mobile bottom nav reduces from current tabs to: Home, Timeline, Settings
