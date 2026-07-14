import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, scheduleEventsTable } from "@workspace/db";
import {
  CreateScheduleEventBody,
  DeleteScheduleEventParams,
  ListScheduleEventsQueryParams,
} from "@workspace/api-zod";
import { todayDateString } from "../lib/dates";

const router: IRouter = Router();

router.get("/schedule", async (req, res): Promise<void> => {
  const query = ListScheduleEventsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const date = query.data.date ?? todayDateString();

  const events = await db
    .select()
    .from(scheduleEventsTable)
    .where(eq(scheduleEventsTable.date, date))
    .orderBy(asc(scheduleEventsTable.time));

  res.json(events);
});

router.post("/schedule", async (req, res): Promise<void> => {
  const parsed = CreateScheduleEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [event] = await db
    .insert(scheduleEventsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(event);
});

router.delete("/schedule/:id", async (req, res): Promise<void> => {
  const params = DeleteScheduleEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [event] = await db
    .delete(scheduleEventsTable)
    .where(eq(scheduleEventsTable.id, params.data.id))
    .returning();

  if (!event) {
    res.status(404).json({ error: "Schedule event not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
