import { date, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scheduleEventsTable = pgTable("schedule_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type", {
    enum: ["homework", "study_session", "event", "note"],
  }).notNull(),
  date: date("date", { mode: "string" }).notNull(),
  time: text("time").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertScheduleEventSchema = createInsertSchema(
  scheduleEventsTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertScheduleEvent = z.infer<typeof insertScheduleEventSchema>;
export type ScheduleEvent = typeof scheduleEventsTable.$inferSelect;
