import { Router, type IRouter } from "express";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db, plannerItemsTable } from "@workspace/db";
import {
  CreatePlannerItemBody,
  DeletePlannerItemParams,
  ListPlannerItemsQueryParams,
  UpdatePlannerItemBody,
  UpdatePlannerItemParams,
} from "@workspace/api-zod";
import { recordStudyActivity, recordTaskCompletion } from "../lib/bloomStats";
import { todayDateString } from "../lib/dates";

const router: IRouter = Router();

router.get("/planner-items", async (req, res): Promise<void> => {
  const query = ListPlannerItemsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const from = query.data.from ?? todayDateString();
  const to = query.data.to ?? from;

  const conditions = [
    gte(plannerItemsTable.date, from),
    lte(plannerItemsTable.date, to),
  ];
  if (query.data.type) {
    conditions.push(eq(plannerItemsTable.type, query.data.type));
  }

  const items = await db
    .select()
    .from(plannerItemsTable)
    .where(and(...conditions))
    .orderBy(asc(plannerItemsTable.date), asc(plannerItemsTable.startTime));

  res.json(items);
});

router.post("/planner-items", async (req, res): Promise<void> => {
  const parsed = CreatePlannerItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .insert(plannerItemsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(item);
});

router.patch("/planner-items/:id", async (req, res): Promise<void> => {
  const params = UpdatePlannerItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePlannerItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(plannerItemsTable)
    .where(eq(plannerItemsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Planner item not found" });
    return;
  }

  const [item] = await db
    .update(plannerItemsTable)
    .set(parsed.data)
    .where(eq(plannerItemsTable.id, params.data.id))
    .returning();

  // Marking an item complete nudges Bloom Progress; completing a study
  // block also logs the actual focus time toward today's streak/minutes.
  if (parsed.data.completed === true && existing.completed !== true) {
    await recordTaskCompletion();

    if (existing.type === "study_block") {
      const duration = computeDurationMinutes(
        existing.startTime,
        existing.endTime,
      );
      if (duration > 0) {
        await recordStudyActivity(existing.date);
      }
    }
  }

  res.json(item);
});

router.delete("/planner-items/:id", async (req, res): Promise<void> => {
  const params = DeletePlannerItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(plannerItemsTable)
    .where(eq(plannerItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Planner item not found" });
    return;
  }

  res.sendStatus(204);
});

function computeDurationMinutes(
  startTime: string | null,
  endTime: string | null,
): number {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  if (
    startH === undefined ||
    startM === undefined ||
    endH === undefined ||
    endM === undefined
  ) {
    return 0;
  }
  return Math.max(0, endH * 60 + endM - (startH * 60 + startM));
}

export default router;
