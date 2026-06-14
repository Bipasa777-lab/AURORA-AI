import { Router } from "express";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { db, hydrationLogsTable, usersTable, notificationsTable } from "@workspace/db";
import { CreateHydrationLogBody, DeleteHydrationLogParams, ListHydrationQueryParams } from "@workspace/api-zod";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

router.get("/hydration/today", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const logs = await db
    .select()
    .from(hydrationLogsTable)
    .where(
      and(
        eq(hydrationLogsTable.userId, user.id),
        gte(hydrationLogsTable.loggedAt, today),
        lt(hydrationLogsTable.loggedAt, tomorrow)
      )
    );

  const totalMl = logs.reduce((sum, l) => sum + l.amountMl, 0);
  const goalMl = user.dailyWaterGoalMl;

  res.json({
    totalMl,
    goalMl,
    remainingMl: Math.max(0, goalMl - totalMl),
    percentComplete: Math.min(100, Math.round((totalMl / goalMl) * 100)),
    logsToday: logs.length,
  });
});

router.get("/hydration/weekly", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);

  const results = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const logs = await db
      .select()
      .from(hydrationLogsTable)
      .where(
        and(
          eq(hydrationLogsTable.userId, user.id),
          gte(hydrationLogsTable.loggedAt, day),
          lt(hydrationLogsTable.loggedAt, nextDay)
        )
      );

    const totalMl = logs.reduce((sum, l) => sum + l.amountMl, 0);
    const goalMl = user.dailyWaterGoalMl;
    results.push({
      date: day.toISOString().split("T")[0],
      totalMl,
      goalMl,
      percentComplete: Math.min(100, Math.round((totalMl / goalMl) * 100)),
    });
  }

  res.json(results);
});

router.get("/hydration", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const params = ListHydrationQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const limit = params.data.limit ?? 50;
  let query = db
    .select()
    .from(hydrationLogsTable)
    .where(eq(hydrationLogsTable.userId, user.id))
    .orderBy(desc(hydrationLogsTable.loggedAt))
    .limit(limit);

  const logs = await query;
  res.json(logs);
});

router.post("/hydration", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const parsed = CreateHydrationLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const loggedAt = parsed.data.loggedAt ? new Date(parsed.data.loggedAt) : new Date();

  const [log] = await db
    .insert(hydrationLogsTable)
    .values({
      userId: user.id,
      amountMl: parsed.data.amountMl,
      note: parsed.data.note,
      loggedAt,
    })
    .returning();

  // Check proximity to hydration goal today
  const today = new Date(loggedAt);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const logs = await db
    .select()
    .from(hydrationLogsTable)
    .where(
      and(
        eq(hydrationLogsTable.userId, user.id),
        gte(hydrationLogsTable.loggedAt, today),
        lt(hydrationLogsTable.loggedAt, tomorrow)
      )
    );
  
  const totalMl = logs.reduce((sum, l) => sum + l.amountMl, 0);
  const goalMl = user.dailyWaterGoalMl;

  if (totalMl < goalMl && totalMl >= goalMl - 350) {
    // Check if we already created "one glass away" notification today
    const existing = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, user.id),
          eq(notificationsTable.type, "hydration"),
          eq(notificationsTable.message, "You're one glass away from today's goal."),
          gte(notificationsTable.createdAt, today)
        )
      );

    if (existing.length === 0) {
      await db.insert(notificationsTable).values({
        userId: user.id,
        type: "hydration",
        message: "You're one glass away from today's goal.",
      });
    }
  }

  res.status(201).json(log);
});

router.delete("/hydration/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [deleted] = await db
    .delete(hydrationLogsTable)
    .where(and(eq(hydrationLogsTable.id, id), eq(hydrationLogsTable.userId, user.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
