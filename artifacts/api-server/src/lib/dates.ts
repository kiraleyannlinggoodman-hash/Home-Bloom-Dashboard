/** Today's calendar date as YYYY-MM-DD (server-local/UTC). */
export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
