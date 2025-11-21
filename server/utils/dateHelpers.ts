/**
 * Calculate the first day of the next month in UTC and return as YYYY-MM-DD string.
 * This ensures consistent quota reset dates regardless of server timezone.
 * 
 * Examples:
 * - If current date is 2025-11-21, returns "2025-12-01"
 * - If current date is 2025-12-31, returns "2026-01-01"
 * 
 * @returns YYYY-MM-DD formatted string representing the first day of next month
 */
export function getNextMonthFirstDayUTC(): string {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return nextMonth.toISOString().split('T')[0]; // YYYY-MM-DD format
}
