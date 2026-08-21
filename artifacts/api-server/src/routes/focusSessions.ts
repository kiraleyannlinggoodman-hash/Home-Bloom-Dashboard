import { Router, type IRouter } from "express";
import { and, asc, desc, eq, isNotNull, sql, ilike } from "drizzle-orm";
import { db, focusSessionsTable } from "@workspace/db";
import {
  StartFocusSessionBody,
  EndFocusSessionBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ---------- Zod schemas ----------

// ---------- GET /focus-sessions ----------

router.get("/focus-sessions", async (req, res) => {
  const { search, subject, sort } = req.query as Record<string, string>;

  let query = db
    .select()
    .from(focusSessionsTable)
    .where(isNotNull(focusSessionsTable.endedAt))
    .$dynamic();

  const conditions: ReturnType<typeof eq>[] = [];
  if (subject && subject !== "all") {
    conditions.push(eq(focusSessionsTable.subject, subject));
  }
  if (search) {
    conditions.push(ilike(focusSessionsTable.name, `%${search}%`));
  }
  if (conditions.length > 0) {
    query = query.where(and(isNotNull(focusSessionsTable.endedAt), ...conditions));
  }

  const orderDir = sort === "asc" ? asc : desc;
  query = query.orderBy(orderDir(focusSessionsTable.startedAt));

  const sessions = await query;
  res.json(sessions);
});

// ---------- POST /focus-sessions ----------

router.post("/focus-sessions", async (req, res) => {
  const parsed = StartFocusSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .insert(focusSessionsTable)
    .values({
      name: parsed.data.name,
      subject: parsed.data.subject ?? null,
      sessionType: parsed.data.sessionType,
      notes: parsed.data.notes ?? null,
      startedAt: new Date(),
    })
    .returning();

  res.status(201).json(session);
});

// ---------- GET /focus-sessions/stats ----------

router.get("/focus-sessions/stats", async (_req, res) => {
  const allCompleted = await db
    .select()
    .from(focusSessionsTable)
    .where(isNotNull(focusSessionsTable.endedAt))
    .orderBy(asc(focusSessionsTable.startedAt));

  const totalMinutes = allCompleted.reduce(
    (sum, s) => sum + (s.durationMinutes ?? 0),
    0,
  );
  const totalSessions = allCompleted.length;
  const avgLength =
    totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

  const ratedSessions = allCompleted.filter((s) => s.focusQuality != null);
  const avgFocusRating =
    ratedSessions.length > 0
      ? parseFloat(
          (
            ratedSessions.reduce((sum, s) => sum + (s.focusQuality ?? 0), 0) /
            ratedSessions.length
          ).toFixed(1),
        )
      : null;

  const longestSession =
    allCompleted.length > 0
      ? Math.max(...allCompleted.map((s) => s.durationMinutes ?? 0))
      : 0;

  // Focus hours by day (last 14 days) — keyed by ISO date string
  const byDay: Record<string, number> = {};
  for (const s of allCompleted) {
    const day = s.startedAt.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + (s.durationMinutes ?? 0);
  }

  // Focus hours by subject
  const bySubject: Record<string, number> = {};
  for (const s of allCompleted) {
    const key = s.subject ?? "Other";
    bySubject[key] = (bySubject[key] ?? 0) + (s.durationMinutes ?? 0);
  }

  // Weekly focus trend — group by ISO week (last 8 weeks)
  const byWeek: Record<string, number> = {};
  for (const s of allCompleted) {
    const d = new Date(s.startedAt);
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - d.getDay());
    const weekKey = startOfWeek.toISOString().slice(0, 10);
    byWeek[weekKey] = (byWeek[weekKey] ?? 0) + (s.durationMinutes ?? 0);
  }

  res.json({
    totalMinutes,
    totalSessions,
    avgLength,
    avgFocusRating,
    longestSession,
    byDay: Object.entries(byDay).map(([date, minutes]) => ({
      date,
      minutes,
    })),
    bySubject: Object.entries(bySubject).map(([subject, minutes]) => ({
      subject,
      minutes,
    })),
    byWeek: Object.entries(byWeek).map(([week, minutes]) => ({
      week,
      minutes,
    })),
  });
});

// ---------- POST /focus-sessions/:id/end ----------

router.post("/focus-sessions/:id/end", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const parsed = EndFocusSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(focusSessionsTable)
    .where(eq(focusSessionsTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [updated] = await db
    .update(focusSessionsTable)
    .set({
      endedAt: new Date(),
      durationMinutes: parsed.data.durationMinutes,
      focusQuality: parsed.data.focusQuality ?? null,
      wentWell: parsed.data.wentWell ?? null,
      distracted: parsed.data.distracted ?? null,
      reflectionNotes: parsed.data.reflectionNotes ?? null,
    })
    .where(eq(focusSessionsTable.id, id))
    .returning();

  // Also log to study_sessions for streak + dashboard integration
  if (parsed.data.durationMinutes > 0) {
    const today = new Date().toISOString().slice(0, 10);
    await db.insert(
      (await import("@workspace/db")).studySessionsTable,
    ).values({
      subject: existing.subject ?? undefined,
      durationMinutes: parsed.data.durationMinutes,
      date: today,
    });
  }

  res.json(updated);
});

// ---------- DELETE /focus-sessions/:id ----------

router.delete("/focus-sessions/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }
  await db.delete(focusSessionsTable).where(eq(focusSessionsTable.id, id));
  res.status(204).send();
});

export default router;
