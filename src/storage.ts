import type { BudgetConfig } from './types';

// Bumped version to v3 to clear old incompatible configs (added monthlyConfig)
const STORAGE_KEY = 'budget-app-config-v3';

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
