import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const focusSessionsTable = pgTable("focus_sessions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject"),
  sessionType: text("session_type").notNull(), // homework | study | revision | practice | other
  notes: text("notes"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationMinutes: integer("duration_minutes"), // actual studied time excluding pauses (sent from client)
  focusQuality: integer("focus_quality"), // 1-10 from reflection
  wentWell: text("went_well"),
  distracted: text("distracted"),
  reflectionNotes: text("reflection_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFocusSessionSchema = createInsertSchema(
  focusSessionsTable,
).omit({ id: true, createdAt: true });

export type InsertFocusSession = z.infer<typeof insertFocusSessionSchema>;
export type FocusSession = typeof focusSessionsTable.$inferSelect;
