import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import {
  CreateTaskBody,
  UpdateTaskBody,
  UpdateTaskParams,
  DeleteTaskParams,
  ListTasksQueryParams,
} from "@workspace/api-zod";
import { recordTaskCompletion } from "../lib/bloomStats";
import { todayDateString } from "../lib/dates";

const router: IRouter = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const query = ListTasksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.dueToday) {
    conditions.push(eq(tasksTable.dueDate, todayDateString()));
  }

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(tasksTable.createdAt);

  res.json(tasks);
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db.insert(tasksTable).values(parsed.data).returning();
  res.status(201).json(task);
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set(parsed.data)
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (parsed.data.completed === true) {
    await recordTaskCompletion();
  }

  res.json(task);
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .delete(tasksTable)
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
