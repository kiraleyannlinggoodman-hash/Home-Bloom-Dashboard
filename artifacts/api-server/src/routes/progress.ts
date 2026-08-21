import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, progressGradesTable } from "@workspace/db";
import {
  CreateProgressGradeBody,
  UpdateProgressGradeBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/progress/grades", async (_req, res): Promise<void> => {
  const grades = await db
    .select()
    .from(progressGradesTable)
    .orderBy(asc(progressGradesTable.createdAt));
  res.json(grades);
});

router.post("/progress/grades", async (req, res): Promise<void> => {
  const parsed = CreateProgressGradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [grade] = await db
    .insert(progressGradesTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(grade);
});

router.patch("/progress/grades/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid grade row id" });
    return;
  }

  const parsed = UpdateProgressGradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [grade] = await db
    .update(progressGradesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(progressGradesTable.id, id))
    .returning();

  if (!grade) {
    res.status(404).json({ error: "Grade row not found" });
    return;
  }
  res.json(grade);
});

router.delete("/progress/grades/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid grade row id" });
    return;
  }
  await db.delete(progressGradesTable).where(eq(progressGradesTable.id, id));
  res.status(204).send();
});

export default router;