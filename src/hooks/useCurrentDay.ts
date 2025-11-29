import { useState, useEffect, useCallback } from 'react';
import { startOfDay } from 'date-fns';

/**
 * Custom hook that tracks the current day and updates at midnight.
 * Returns a stable date string (YYYY-MM-DD) that changes only when the day changes,
 * plus a forceRefresh function to manually trigger recalculation.
 */
export function useCurrentDay(): { currentDay: string; forceRefresh: () => void } {
  const getDateString = () => startOfDay(new Date()).toISOString().split('T')[0];

  const [currentDay, setCurrentDay] = useState(getDateString);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Force a recalculation by updating the refresh counter
  const forceRefresh = useCallback(() => {
    setCurrentDay(getDateString());
    setRefreshCounter(c => c + 1);
  }, []);

  useEffect(() => {
    // Calculate milliseconds until next midnight
    const now = new Date();
    const tomorrow = startOfDay(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    // Set timeout for midnight update
    const midnightTimeout = setTimeout(() => {
      setCurrentDay(getDateString());
    }, msUntilMidnight + 100); // Add 100ms buffer to ensure we're past midnight

    // Also check periodically in case the tab was suspended/backgrounded
    // and missed the midnight timeout
    const intervalId = setInterval(() => {
      const newDay = getDateString();
      if (newDay !== currentDay) {
        setCurrentDay(newDay);
      }
    }, 60000); // Check every minute

    return () => {
      clearTimeout(midnightTimeout);
      clearInterval(intervalId);
    };
  }, [currentDay]);

  // Combine currentDay with refreshCounter to create a unique key for recalculation
  const refreshKey = `${currentDay}-${refreshCounter}`;

  return { currentDay: refreshKey, forceRefresh };
}
