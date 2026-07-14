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

export const subjectFilesTable = pgTable("subject_files", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  objectPath: text("object_path").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertSubjectFileSchema = createInsertSchema(
  subjectFilesTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertSubjectFile = z.infer<typeof insertSubjectFileSchema>;
export type SubjectFile = typeof subjectFilesTable.$inferSelect;
