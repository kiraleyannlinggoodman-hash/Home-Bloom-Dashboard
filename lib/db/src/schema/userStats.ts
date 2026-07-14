import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";

// Singleton row (id = 1) holding derived personal-growth stats that aren't
// naturally computed from other tables, such as the Bloom Progress bar and
// the focus streak counter (updated whenever a study session is logged).
export const userStatsTable = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  bloomProgressPercent: integer("bloom_progress_percent").notNull().default(0),
  focusStreakDays: integer("focus_streak_days").notNull().default(0),
  lastStudyDate: timestamp("last_study_date", { withTimezone: true }),
});

export type UserStats = typeof userStatsTable.$inferSelect;
