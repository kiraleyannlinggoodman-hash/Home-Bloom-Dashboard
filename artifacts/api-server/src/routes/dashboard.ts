import { Router, type IRouter } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  db,
  examsTable,
  studySessionsTable,
  tasksTable,
} from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { bloomProgressLabel, getOrCreateUserStats } from "../lib/bloomStats";
import { todayDateString } from "../lib/dates";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const today = todayDateString();

  const [tasksDueTodayResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasksTable)
    .where(and(eq(tasksTable.dueDate, today), eq(tasksTable.completed, false)));

  const [upcomingExamsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(examsTable)
    .where(gte(examsTable.examDate, today));

  const [studyMinutesResult] = await db
    .select({ total: sql<number>`coalesce(sum(duration_minutes), 0)::int` })
    .from(studySessionsTable)
    .where(eq(studySessionsTable.date, today));

  const stats = await getOrCreateUserStats();

  const summary = {
    greetingName: "Kira",
    studyMinutesToday: studyMinutesResult?.total ?? 0,
    tasksDueToday: tasksDueTodayResult?.count ?? 0,
    upcomingExamsCount: upcomingExamsResult?.count ?? 0,
    focusStreakDays: stats.focusStreakDays,
    bloomProgressPercent: stats.bloomProgressPercent,
    bloomProgressLabel: bloomProgressLabel(stats.bloomProgressPercent),
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

export default router;
