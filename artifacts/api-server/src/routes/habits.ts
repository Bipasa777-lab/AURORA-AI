import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, habitsTable, habitLogsTable, notificationsTable } from "@workspace/db";
import {
  CreateHabitBody, UpdateHabitBody, UpdateHabitParams, DeleteHabitParams,
  GetHabitParams, CompleteHabitBody, CompleteHabitParams, SkipHabitBody, SkipHabitParams
} from "@workspace/api-zod";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

router.get("/habits/today", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const today = new Date().toISOString().split("T")[0];

  const habits = await db
    .select()
    .from(habitsTable)
    .where(and(eq(habitsTable.userId, user.id), eq(habitsTable.status, "active")));

  const todayLogs = await db
    .select()
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.userId, user.id), eq(habitLogsTable.logDate, today)));

  const result = habits.map(habit => {
    const log = todayLogs.find(l => l.habitId === habit.id);
    return {
      habit,
      todayStatus: log?.status ?? null,
    };
  });

  res.json(result);
});

router.get("/habits", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);

  const habits = await db
    .select()
    .from(habitsTable)
    .where(eq(habitsTable.userId, user.id))
    .orderBy(desc(habitsTable.createdAt));

  res.json(habits);
});

router.post("/habits", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const parsed = CreateHabitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [habit] = await db
    .insert(habitsTable)
    .values({
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      icon: parsed.data.icon,
      color: parsed.data.color,
      frequency: parsed.data.frequency,
      timeOfDay: parsed.data.timeOfDay,
    })
    .returning();

  res.status(201).json(habit);
});

router.get("/habits/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [habit] = await db
    .select()
    .from(habitsTable)
    .where(and(eq(habitsTable.id, id), eq(habitsTable.userId, user.id)));

  if (!habit) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(habit);
});

router.patch("/habits/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const parsed = UpdateHabitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(habitsTable)
    .set(parsed.data)
    .where(and(eq(habitsTable.id, id), eq(habitsTable.userId, user.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/habits/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [deleted] = await db
    .delete(habitsTable)
    .where(and(eq(habitsTable.id, id), eq(habitsTable.userId, user.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/habits/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const parsed = CompleteHabitBody.safeParse(req.body);

  const today = new Date().toISOString().split("T")[0];
  const logDate = parsed.success && parsed.data.logDate ? parsed.data.logDate : today;

  const [habit] = await db.select().from(habitsTable)
    .where(and(eq(habitsTable.id, id), eq(habitsTable.userId, user.id)));
  if (!habit) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // upsert log
  const existing = await db.select().from(habitLogsTable)
    .where(and(eq(habitLogsTable.habitId, id), eq(habitLogsTable.logDate, logDate as string), eq(habitLogsTable.userId, user.id)));

  let log;
  if (existing[0]) {
    [log] = await db.update(habitLogsTable).set({ status: "completed" })
      .where(eq(habitLogsTable.id, existing[0].id)).returning();
  } else {
    [log] = await db.insert(habitLogsTable).values({
      habitId: id,
      userId: user.id,
      status: "completed",
      logDate: logDate as string,
      notes: parsed.success ? (parsed.data.notes ?? null) : null,
    }).returning();

    const newStreak = habit.currentStreak + 1;
    await db.update(habitsTable).set({
      totalCompletions: habit.totalCompletions + 1,
      currentStreak: newStreak,
      longestStreak: Math.max(habit.longestStreak, newStreak),
    }).where(eq(habitsTable.id, id));

    // Streak notification on multiples of 5 days
    if (newStreak > 0 && newStreak % 5 === 0) {
      await db.insert(notificationsTable).values({
        userId: user.id,
        type: "habits",
        message: `You've completed this habit for ${newStreak} days in a row.`,
      });
    }
  }

  res.json(log);
});

router.post("/habits/:id/skip", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const parsed = SkipHabitBody.safeParse(req.body);

  const today = new Date().toISOString().split("T")[0];
  const logDate = parsed.success && parsed.data.logDate ? parsed.data.logDate : today;

  const [habit] = await db.select().from(habitsTable)
    .where(and(eq(habitsTable.id, id), eq(habitsTable.userId, user.id)));
  if (!habit) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const existing = await db.select().from(habitLogsTable)
    .where(and(eq(habitLogsTable.habitId, id), eq(habitLogsTable.logDate, logDate as string), eq(habitLogsTable.userId, user.id)));

  let log;
  if (existing[0]) {
    [log] = await db.update(habitLogsTable).set({ status: "skipped" })
      .where(eq(habitLogsTable.id, existing[0].id)).returning();
  } else {
    [log] = await db.insert(habitLogsTable).values({
      habitId: id,
      userId: user.id,
      status: "skipped",
      logDate: logDate as string,
      notes: parsed.success ? (parsed.data.notes ?? null) : null,
    }).returning();
  }

  res.json(log);
});

export default router;
