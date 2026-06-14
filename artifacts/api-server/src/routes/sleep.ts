import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, sleepLogsTable } from "@workspace/db";
import { CreateSleepLogBody, UpdateSleepLogBody, UpdateSleepLogParams, DeleteSleepLogParams } from "@workspace/api-zod";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

router.get("/sleep/analysis", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);

  const logs = await db
    .select()
    .from(sleepLogsTable)
    .where(eq(sleepLogsTable.userId, user.id))
    .orderBy(desc(sleepLogsTable.sleepDate))
    .limit(30);

  const weekly = logs.slice(0, 7);
  const avgDuration = weekly.length > 0
    ? weekly.reduce((s, l) => s + l.durationHours, 0) / weekly.length
    : 0;

  const qualityLogs = weekly.filter(l => l.qualityScore != null);
  const avgQuality = qualityLogs.length > 0
    ? qualityLogs.reduce((s, l) => s + (l.qualityScore ?? 0), 0) / qualityLogs.length
    : null;

  const goal = user.dailySleepGoalHours;
  const onTargetDays = weekly.filter(l => l.durationHours >= goal * 0.85).length;
  const consistency = weekly.length > 0 ? Math.round((onTargetDays / weekly.length) * 100) : 0;

  let insight = "Start logging your sleep to get personalized insights.";
  if (weekly.length >= 3) {
    if (avgDuration < goal * 0.8) {
      insight = `You're averaging ${avgDuration.toFixed(1)}h — below your ${goal}h goal. Try an earlier bedtime.`;
    } else if (consistency >= 80) {
      insight = `Great consistency! You're hitting your sleep goal ${consistency}% of days this week.`;
    } else {
      insight = `You sleep ${avgDuration.toFixed(1)}h on average. Aim for more consistent bedtimes to improve quality.`;
    }
  }

  res.json({
    avgDurationHours: Math.round(avgDuration * 10) / 10,
    avgQualityScore: avgQuality,
    consistency,
    weeklyData: weekly,
    longestStreak: 0,
    bestSleepTime: user.bedtime,
    insight,
  });
});

router.get("/sleep", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const limit = parseInt((req.query.limit as string) || "30", 10);

  const logs = await db
    .select()
    .from(sleepLogsTable)
    .where(eq(sleepLogsTable.userId, user.id))
    .orderBy(desc(sleepLogsTable.sleepDate))
    .limit(limit);

  res.json(logs);
});

router.post("/sleep", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const parsed = CreateSleepLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const bedtime = new Date(parsed.data.bedtime);
  const wakeTime = new Date(parsed.data.wakeTime);
  const durationHours = (wakeTime.getTime() - bedtime.getTime()) / (1000 * 60 * 60);

  const [log] = await db
    .insert(sleepLogsTable)
    .values({
      userId: user.id,
      sleepDate: String(parsed.data.sleepDate),
      bedtime,
      wakeTime,
      durationHours: Math.round(durationHours * 100) / 100,
      qualityScore: parsed.data.qualityScore ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  res.status(201).json(log);
});

router.patch("/sleep/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const parsed = UpdateSleepLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, any> = {};
  if (parsed.data.bedtime) updateData.bedtime = new Date(parsed.data.bedtime);
  if (parsed.data.wakeTime) updateData.wakeTime = new Date(parsed.data.wakeTime);
  if (parsed.data.qualityScore != null) updateData.qualityScore = parsed.data.qualityScore;
  if (parsed.data.notes != null) updateData.notes = parsed.data.notes;

  if (updateData.bedtime && updateData.wakeTime) {
    updateData.durationHours = Math.round(
      ((updateData.wakeTime.getTime() - updateData.bedtime.getTime()) / (1000 * 60 * 60)) * 100
    ) / 100;
  }

  const [updated] = await db
    .update(sleepLogsTable)
    .set(updateData)
    .where(and(eq(sleepLogsTable.id, id), eq(sleepLogsTable.userId, user.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/sleep/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [deleted] = await db
    .delete(sleepLogsTable)
    .where(and(eq(sleepLogsTable.id, id), eq(sleepLogsTable.userId, user.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
