import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { migrateToStaticPeriods, needsStaticPeriodsMigration } from '../utils/migrationV2';
import type { BudgetConfig, Period } from '../types';

describe('Integration: Migration with real data', () => {
  it('should correctly migrate the current budget.json', () => {
    // Load the actual budget data
    const rawData = readFileSync('./data/budget.json', 'utf-8');
    const config = JSON.parse(rawData) as BudgetConfig;

    // Check if migration is needed
    const needsMigration = needsStaticPeriodsMigration(config);
    console.log('Needs migration:', needsMigration);

    if (needsMigration) {
      // Run migration
      const migrated = migrateToStaticPeriods(config);

      // Cast to access Period properties
      const periods = migrated.periods as unknown as Period[];

      // Should have an active period
      const activePeriod = periods.find(p => p.status === 'active');
      expect(activePeriod).toBeDefined();
      console.log('Active period start:', activePeriod?.startDate);
      console.log('Active period transactions:', activePeriod?.transactions.length);

      // adHocTransactions should be cleared
      expect(migrated.adHocTransactions).toEqual([]);

      // periodStartSnapshot should be undefined
      expect(migrated.periodStartSnapshot).toBeUndefined();

      console.log('Migration successful!');
    }
  });
});
