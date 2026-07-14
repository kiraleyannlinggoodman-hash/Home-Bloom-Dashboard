import { date, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const examsTable = pgTable("exams", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  examDate: date("exam_date", { mode: "string" }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertExamSchema = createInsertSchema(examsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof examsTable.$inferSelect;
