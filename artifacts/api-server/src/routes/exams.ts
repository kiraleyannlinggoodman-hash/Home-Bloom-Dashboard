import { Router, type IRouter } from "express";
import { asc, eq, gte } from "drizzle-orm";
import { db, examsTable } from "@workspace/db";
import {
  CreateExamBody,
  DeleteExamParams,
  ListExamsQueryParams,
} from "@workspace/api-zod";
import { todayDateString } from "../lib/dates";

const router: IRouter = Router();

router.get("/exams", async (req, res): Promise<void> => {
  const query = ListExamsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const exams = await db
    .select()
    .from(examsTable)
    .where(query.data.upcoming ? gte(examsTable.examDate, todayDateString()) : undefined)
    .orderBy(asc(examsTable.examDate));

  res.json(exams);
});

router.post("/exams", async (req, res): Promise<void> => {
  const parsed = CreateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [exam] = await db.insert(examsTable).values(parsed.data).returning();
  res.status(201).json(exam);
});

router.delete("/exams/:id", async (req, res): Promise<void> => {
  const params = DeleteExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [exam] = await db
    .delete(examsTable)
    .where(eq(examsTable.id, params.data.id))
    .returning();

  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
