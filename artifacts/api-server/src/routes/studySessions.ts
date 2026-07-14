import { Router, type IRouter } from "express";
import { db, studySessionsTable } from "@workspace/db";
import { CreateStudySessionBody } from "@workspace/api-zod";
import { recordStudyActivity } from "../lib/bloomStats";
import { todayDateString } from "../lib/dates";

const router: IRouter = Router();

router.post("/study-sessions", async (req, res): Promise<void> => {
  const parsed = CreateStudySessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const date = parsed.data.date ?? todayDateString();

  const [session] = await db
    .insert(studySessionsTable)
    .values({ ...parsed.data, date })
    .returning();

  await recordStudyActivity(date);

  res.status(201).json(session);
});

export default router;
