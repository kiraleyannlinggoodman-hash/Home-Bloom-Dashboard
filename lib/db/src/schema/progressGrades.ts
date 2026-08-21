import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// One row per subject is the single source of truth for every Progress chart.
export const progressGradesTable = pgTable("progress_grades", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull().unique(),
  term1: integer("term_1"),
  term2: integer("term_2"),
  term3: integer("term_3"),
  term4: integer("term_4"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProgressGradeSchema = createInsertSchema(progressGradesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProgressGrade = z.infer<typeof insertProgressGradeSchema>;
export type ProgressGrade = typeof progressGradesTable.$inferSelect;