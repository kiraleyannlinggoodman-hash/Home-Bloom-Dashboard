import { boolean, date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Single unified table backing the Bloom Planner. Every schedulable item
// (homework, exam, event, study block, or note) lives here with a `type`
// discriminator instead of separate per-type tables, so the planner UI can
// filter/group/aggregate across types without joining multiple tables.
export const plannerItemsTable = pgTable("planner_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type", {
    enum: ["homework", "exam", "event", "study_block", "note"],
  }).notNull(),
  subject: text("subject"),
  date: date("date", { mode: "string" }).notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  reminderMinutes: integer("reminder_minutes"),
  priority: text("priority", { enum: ["low", "medium", "high"] })
    .notNull()
    .default("medium"),
  completed: boolean("completed").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPlannerItemSchema = createInsertSchema(
  plannerItemsTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertPlannerItem = z.infer<typeof insertPlannerItemSchema>;
export type PlannerItem = typeof plannerItemsTable.$inferSelect;
