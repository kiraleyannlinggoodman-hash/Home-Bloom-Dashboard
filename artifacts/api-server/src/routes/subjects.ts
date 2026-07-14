import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import {
  db,
  plannerItemsTable,
  studySessionsTable,
  subjectFilesTable,
  subjectNotesTable,
  subjectsTable,
  type Subject,
} from "@workspace/db";
import {
  CreateSubjectFileBody,
  CreateSubjectNoteBody,
  CreateSubjectBody,
  UpdateSubjectBody,
  UpdateSubjectNoteBody,
} from "@workspace/api-zod";
import { todayDateString } from "../lib/dates";

const router: IRouter = Router();

export function masteryLabel(percent: number): string {
  if (percent >= 90) return "Mastered";
  if (percent >= 67) return "Confident";
  if (percent >= 34) return "Growing";
  return "Just Started";
}

async function getUpcomingItem(subjectName: string) {
  const today = todayDateString();
  const [item] = await db
    .select()
    .from(plannerItemsTable)
    .where(
      and(
        eq(plannerItemsTable.subject, subjectName),
        gte(plannerItemsTable.date, today),
        eq(plannerItemsTable.completed, false),
        sql`${plannerItemsTable.type} in ('homework', 'exam')`,
      ),
    )
    .orderBy(asc(plannerItemsTable.date), asc(plannerItemsTable.startTime))
    .limit(1);
  return item ?? null;
}

async function toSubjectCard(subject: Subject) {
  const [notesCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subjectNotesTable)
    .where(eq(subjectNotesTable.subjectId, subject.id));
  const [filesCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subjectFilesTable)
    .where(eq(subjectFilesTable.subjectId, subject.id));
  const upcomingItem = await getUpcomingItem(subject.name);

  return {
    ...subject,
    masteryLabel: masteryLabel(subject.masteryPercent),
    notesCount: notesCountResult?.count ?? 0,
    filesCount: filesCountResult?.count ?? 0,
    upcomingItem,
  };
}

router.get("/subjects", async (_req, res): Promise<void> => {
  const subjects = await db
    .select()
    .from(subjectsTable)
    .orderBy(asc(subjectsTable.createdAt));
  const cards = await Promise.all(subjects.map(toSubjectCard));
  res.json(cards);
});

router.post("/subjects", async (req, res): Promise<void> => {
  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [subject] = await db
    .insert(subjectsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(await toSubjectCard(subject!));
});

router.get("/subjects/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, id));

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  res.json(await toSubjectCard(subject));
});

router.patch("/subjects/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = UpdateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [subject] = await db
    .update(subjectsTable)
    .set(parsed.data)
    .where(eq(subjectsTable.id, id))
    .returning();

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  res.json(await toSubjectCard(subject));
});

router.delete("/subjects/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [subject] = await db
    .delete(subjectsTable)
    .where(eq(subjectsTable.id, id))
    .returning();

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/subjects/:id/summary", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, id));

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  const [studyMinutesResult] = await db
    .select({ total: sql<number>`coalesce(sum(duration_minutes), 0)::int` })
    .from(studySessionsTable)
    .where(eq(studySessionsTable.subject, subject.name));

  const homeworkItems = await db
    .select()
    .from(plannerItemsTable)
    .where(
      and(
        eq(plannerItemsTable.subject, subject.name),
        eq(plannerItemsTable.type, "homework"),
      ),
    );
  const tasksTotal = homeworkItems.length;
  const tasksCompleted = homeworkItems.filter((item) => item.completed).length;

  const [recentNotes, recentFiles, recentSessions, recentPlannerItems] =
    await Promise.all([
      db
        .select()
        .from(subjectNotesTable)
        .where(eq(subjectNotesTable.subjectId, subject.id))
        .orderBy(desc(subjectNotesTable.updatedAt))
        .limit(5),
      db
        .select()
        .from(subjectFilesTable)
        .where(eq(subjectFilesTable.subjectId, subject.id))
        .orderBy(desc(subjectFilesTable.createdAt))
        .limit(5),
      db
        .select()
        .from(studySessionsTable)
        .where(eq(studySessionsTable.subject, subject.name))
        .orderBy(desc(studySessionsTable.createdAt))
        .limit(5),
      db
        .select()
        .from(plannerItemsTable)
        .where(eq(plannerItemsTable.subject, subject.name))
        .orderBy(desc(plannerItemsTable.createdAt))
        .limit(5),
    ]);

  const recentActivity = [
    ...recentNotes.map((note) => ({
      kind: "note" as const,
      title: `Added note "${note.title}"`,
      emoji: "📝",
      timestamp: note.updatedAt.toISOString(),
    })),
    ...recentFiles.map((file) => ({
      kind: "file" as const,
      title: `Uploaded "${file.fileName}"`,
      emoji: "📄",
      timestamp: file.createdAt.toISOString(),
    })),
    ...recentSessions.map((session) => ({
      kind: "study_session" as const,
      title: `Studied for ${session.durationMinutes} min`,
      emoji: "🔥",
      timestamp: session.createdAt.toISOString(),
    })),
    ...recentPlannerItems.map((item) => ({
      kind: "planner_item" as const,
      title: item.completed ? `Completed "${item.title}"` : `Added "${item.title}"`,
      emoji: item.completed ? "✅" : "🗓️",
      timestamp: item.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, 8);

  res.json({
    studyMinutesTotal: studyMinutesResult?.total ?? 0,
    tasksCompleted,
    tasksTotal,
    recentActivity,
  });
});

router.get("/subjects/:id/notes", async (req, res): Promise<void> => {
  const subjectId = Number(req.params.id);
  const notes = await db
    .select()
    .from(subjectNotesTable)
    .where(eq(subjectNotesTable.subjectId, subjectId))
    .orderBy(desc(subjectNotesTable.updatedAt));
  res.json(notes);
});

router.post("/subjects/:id/notes", async (req, res): Promise<void> => {
  const subjectId = Number(req.params.id);
  const parsed = CreateSubjectNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [note] = await db
    .insert(subjectNotesTable)
    .values({ ...parsed.data, subjectId })
    .returning();
  res.status(201).json(note);
});

router.patch(
  "/subjects/:id/notes/:noteId",
  async (req, res): Promise<void> => {
    const noteId = Number(req.params.noteId);
    const parsed = UpdateSubjectNoteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [note] = await db
      .update(subjectNotesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(subjectNotesTable.id, noteId))
      .returning();

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.json(note);
  },
);

router.delete(
  "/subjects/:id/notes/:noteId",
  async (req, res): Promise<void> => {
    const noteId = Number(req.params.noteId);
    const [note] = await db
      .delete(subjectNotesTable)
      .where(eq(subjectNotesTable.id, noteId))
      .returning();

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.sendStatus(204);
  },
);

router.get("/subjects/:id/files", async (req, res): Promise<void> => {
  const subjectId = Number(req.params.id);
  const files = await db
    .select()
    .from(subjectFilesTable)
    .where(eq(subjectFilesTable.subjectId, subjectId))
    .orderBy(desc(subjectFilesTable.createdAt));
  res.json(files);
});

router.post("/subjects/:id/files", async (req, res): Promise<void> => {
  const subjectId = Number(req.params.id);
  const parsed = CreateSubjectFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [file] = await db
    .insert(subjectFilesTable)
    .values({ ...parsed.data, subjectId })
    .returning();
  res.status(201).json(file);
});

router.delete(
  "/subjects/:id/files/:fileId",
  async (req, res): Promise<void> => {
    const fileId = Number(req.params.fileId);
    const [file] = await db
      .delete(subjectFilesTable)
      .where(eq(subjectFilesTable.id, fileId))
      .returning();

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    res.sendStatus(204);
  },
);

export default router;
