import type { BudgetConfig } from './types';
import { migrateToHistoricalPeriods, needsMigration } from './utils/migration';

/**
 * Save config to JSON file via dev server
 */
export async function saveBudget(config: BudgetConfig): Promise<void> {
  try {
    await fetch('/__save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config, null, 2),
    });
  } catch (error) {
    console.error('Failed to save budget config:', error);
  }
}

/**
 * Load config from JSON file via dev server
 */
export async function loadBudget(): Promise<BudgetConfig | null> {
  try {
    const response = await fetch('/__load-config');
    if (response.ok) {
      const config = await response.json() as BudgetConfig;

      // Run migration if needed
      if (needsMigration(config)) {
        const migrated = migrateToHistoricalPeriods(config);
        // Save migrated config
        await saveBudget(migrated);
        return migrated;
      }

      return config;
    }
    return null;
  } catch (error) {
    console.error('Failed to load budget config:', error);
    return null;
  }
}
