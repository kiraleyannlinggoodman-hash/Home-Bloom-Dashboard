import {
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studySessionsTable = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  subject: text("subject"),
  durationMinutes: integer("duration_minutes").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertStudySessionSchema = createInsertSchema(
  studySessionsTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertStudySession = z.infer<typeof insertStudySessionSchema>;
export type StudySession = typeof studySessionsTable.$inferSelect;
