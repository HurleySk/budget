import type { BudgetConfig } from './types';

// v4: expenses now have nextDueDate for date-based scheduling
const STORAGE_KEY = 'budget-app-config-v4';

export function saveBudget(config: BudgetConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save budget config:', error);
  }
}

export function loadBudget(): BudgetConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as BudgetConfig;
  } catch (error) {
    console.error('Failed to load budget config:', error);
    return null;
  }
}

export function clearBudget(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear budget config:', error);
  }
}
