import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// A school subject "binder" — the home for that subject's notes, files,
// mastery level, and (via text-matching on `plannerItems.subject` /
// `studySessions.subject`) its planner items and logged study time.
export const subjectsTable = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  emoji: text("emoji").notNull(),
  masteryPercent: integer("mastery_percent").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertSubjectSchema = createInsertSchema(subjectsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjectsTable.$inferSelect;
