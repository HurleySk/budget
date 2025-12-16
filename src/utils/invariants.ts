import { parseISO, isAfter } from 'date-fns';

/**
 * Invariant checks - fail fast when assumptions are violated.
 * Use these at function entry points to catch bad data early.
 */

/**
 * Assert that a date is valid, returning the parsed Date object.
 * Throws if the date is invalid.
 */
export function assertValidDate(date: Date | string, context: string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date in ${context}: ${date}`);
  }
  return d;
}

/**
 * Assert that a number is positive (>= 0).
 * Throws if the number is negative, NaN, or not a number.
 */
export function assertPositiveNumber(n: number, context: string): number {
  if (typeof n !== 'number' || isNaN(n) || n < 0) {
    throw new Error(`Expected positive number in ${context}, got: ${n}`);
  }
  return n;
}

/**
 * Assert that a number is strictly positive (> 0).
 * Throws if the number is zero, negative, NaN, or not a number.
 */
export function assertStrictlyPositive(n: number, context: string): number {
  if (typeof n !== 'number' || isNaN(n) || n <= 0) {
    throw new Error(`Expected strictly positive number in ${context}, got: ${n}`);
  }
  return n;
}

/**
 * Assert that period start date is before or equal to end date.
 * Throws if start is after end.
 */
export function assertPeriodDatesValid(start: Date, end: Date, context: string): void {
  if (isAfter(start, end)) {
    throw new Error(
      `Period start is after end in ${context}: start=${start.toISOString()}, end=${end.toISOString()}`
    );
  }
}

/**
 * Log a warning if condition is true.
 * Use for soft failures that shouldn't crash but indicate a problem.
 */
export function warnIf(condition: boolean, message: string): void {
  if (condition) {
    console.warn(`[Budget Warning] ${message}`);
  }
}

/**
 * Log a warning with context data if condition is true.
 */
export function warnIfWithData(condition: boolean, message: string, data: unknown): void {
  if (condition) {
    console.warn(`[Budget Warning] ${message}`, data);
  }
}
