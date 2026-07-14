import { eq } from "drizzle-orm";
import { db, userStatsTable, type UserStats } from "@workspace/db";

const STATS_ROW_ID = 1;

/** Ensures the singleton user_stats row exists and returns it. */
export async function getOrCreateUserStats(): Promise<UserStats> {
  const [existing] = await db
    .select()
    .from(userStatsTable)
    .where(eq(userStatsTable.id, STATS_ROW_ID));

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(userStatsTable)
    .values({ id: STATS_ROW_ID, bloomProgressPercent: 0, focusStreakDays: 0 })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  // Row was created concurrently; fetch it.
  const [row] = await db
    .select()
    .from(userStatsTable)
    .where(eq(userStatsTable.id, STATS_ROW_ID));
  return row!;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Bumps the streak and progress bar when a study session is logged.
 * Streak continues if the last study day was yesterday or today, otherwise resets to 1.
 * Progress nudges up by a small amount per session, capped at 100.
 */
export async function recordStudyActivity(sessionDate: string): Promise<void> {
  const stats = await getOrCreateUserStats();
  const today = sessionDate;
  const yesterday = toDateOnly(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const lastDate = stats.lastStudyDate
    ? toDateOnly(new Date(stats.lastStudyDate))
    : null;

  let nextStreak = stats.focusStreakDays;
  if (lastDate === today) {
    nextStreak = Math.max(stats.focusStreakDays, 1);
  } else if (lastDate === yesterday) {
    nextStreak = stats.focusStreakDays + 1;
  } else {
    nextStreak = 1;
  }

  const nextProgress = Math.min(100, stats.bloomProgressPercent + 4);

  await db
    .update(userStatsTable)
    .set({
      focusStreakDays: nextStreak,
      bloomProgressPercent: nextProgress,
      lastStudyDate: new Date(`${today}T00:00:00.000Z`),
    })
    .where(eq(userStatsTable.id, STATS_ROW_ID));
}

/** Small progress nudge for completing a task. */
export async function recordTaskCompletion(): Promise<void> {
  const stats = await getOrCreateUserStats();
  const nextProgress = Math.min(100, stats.bloomProgressPercent + 2);
  await db
    .update(userStatsTable)
    .set({ bloomProgressPercent: nextProgress })
    .where(eq(userStatsTable.id, STATS_ROW_ID));
}

export function bloomProgressLabel(percent: number): string {
  if (percent >= 100) return "In Full Bloom";
  if (percent >= 67) return "Blooming";
  if (percent >= 34) return "Growing";
  return "Sprouting";
}
