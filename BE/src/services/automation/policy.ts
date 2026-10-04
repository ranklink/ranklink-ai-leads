export const MAX_RUN_ATTEMPTS = 3;
export const LEASE_MS = 90_000;
export class RunStopped extends Error {}
export class BudgetExceeded extends Error {}
export function retryDelay(attempt: number): number { return Math.min(300_000, 15_000 * 2 ** Math.max(0, attempt - 1)); }
export function nextSchedule(intervalHours: number | null, now = new Date()): Date | null {
  return intervalHours === null ? null : new Date(now.getTime() + intervalHours * 3_600_000);
}
