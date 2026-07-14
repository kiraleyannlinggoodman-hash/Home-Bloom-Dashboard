import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";

export const subjectNotesTable = pgTable("subject_notes", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertSubjectNoteSchema = createInsertSchema(
  subjectNotesTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSubjectNote = z.infer<typeof insertSubjectNoteSchema>;
export type SubjectNote = typeof subjectNotesTable.$inferSelect;
