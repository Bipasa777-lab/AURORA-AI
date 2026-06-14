import { Router } from "express";
import { eq, and, desc, gte, lt } from "drizzle-orm";
import { db, healthMemoriesTable, hydrationLogsTable, sleepLogsTable, habitsTable, habitLogsTable } from "@workspace/db";
import { CreateMemoryBody } from "@workspace/api-zod";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

async function analyzeAndGenerateMemories(user: any) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // 1. HYDRATION ANALYSIS (last 7 days)
    let hydrationGoalDays = 0;
    for (let i = 0; i < 7; i++) {
      const day = new Date(sevenDaysAgo);
      day.setDate(day.getDate() + i);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const logs = await db.select().from(hydrationLogsTable)
        .where(and(eq(hydrationLogsTable.userId, user.id), gte(hydrationLogsTable.loggedAt, day), lt(hydrationLogsTable.loggedAt, nextDay)));
      const total = logs.reduce((s, l) => s + l.amountMl, 0);
      if (total >= user.dailyWaterGoalMl * 0.8) hydrationGoalDays++;
    }

    // Update hydration memory
    await db.delete(healthMemoriesTable).where(and(eq(healthMemoriesTable.userId, user.id), eq(healthMemoriesTable.category, "hydration"), eq(healthMemoriesTable.source, "system")));
    if (hydrationGoalDays <= 2) {
      await db.insert(healthMemoriesTable).values({
        userId: user.id,
        category: "hydration",
        observation: "User often misses hydration goals.",
        source: "system",
      });
    } else if (hydrationGoalDays >= 5) {
      await db.insert(healthMemoriesTable).values({
        userId: user.id,
        category: "hydration",
        observation: "User consistently achieves hydration goals.",
        source: "system",
      });
    }

    // 2. SLEEP ANALYSIS (last 14 days)
    const sleepLogs = await db.select().from(sleepLogsTable)
      .where(and(eq(sleepLogsTable.userId, user.id), gte(sleepLogsTable.sleepDate, fourteenDaysAgo.toISOString().split("T")[0])));

    const weekendSleep: number[] = [];
    const weekdaySleep: number[] = [];

    sleepLogs.forEach(log => {
      const date = new Date(log.sleepDate + "T12:00:00");
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendSleep.push(log.durationHours);
      } else {
        weekdaySleep.push(log.durationHours);
      }
    });

    await db.delete(healthMemoriesTable).where(and(eq(healthMemoriesTable.userId, user.id), eq(healthMemoriesTable.category, "sleep"), eq(healthMemoriesTable.source, "system")));

    if (weekendSleep.length >= 2 && weekdaySleep.length >= 3) {
      const avgWeekend = weekendSleep.reduce((s, d) => s + d, 0) / weekendSleep.length;
      const avgWeekday = weekdaySleep.reduce((s, d) => s + d, 0) / weekdaySleep.length;
      if (avgWeekend - avgWeekday >= 1.5) {
        await db.insert(healthMemoriesTable).values({
          userId: user.id,
          category: "sleep",
          observation: "User sleeps better on weekends.",
          source: "system",
        });
      } else if (avgWeekday < user.dailySleepGoalHours - 1) {
        await db.insert(healthMemoriesTable).values({
          userId: user.id,
          category: "sleep",
          observation: "User gets less sleep on weekdays.",
          source: "system",
        });
      }
    }

    // 3. HABIT ANALYSIS (last 7 days)
    const habits = await db.select().from(habitsTable)
      .where(and(eq(habitsTable.userId, user.id), eq(habitsTable.status, "active")));

    const habitLogs = await db.select().from(habitLogsTable)
      .where(and(eq(habitLogsTable.userId, user.id), gte(habitLogsTable.createdAt, sevenDaysAgo)));

    await db.delete(healthMemoriesTable).where(and(eq(healthMemoriesTable.userId, user.id), eq(healthMemoriesTable.category, "habits"), eq(healthMemoriesTable.source, "system")));

    let completedMorningCount = 0;
    let totalMorningPossible = 0;

    for (const habit of habits) {
      const logs = habitLogs.filter(l => l.habitId === habit.id && l.status === "completed");
      if (habit.timeOfDay === "morning") {
        completedMorningCount += logs.length;
        totalMorningPossible += 7;
      }
      if (logs.length >= 5) {
        await db.insert(healthMemoriesTable).values({
          userId: user.id,
          category: "habits",
          observation: `User completes ${habit.name} consistently.`,
          source: "system",
        });
      }
    }

    if (totalMorningPossible > 0 && (completedMorningCount / totalMorningPossible) >= 0.7) {
      await db.insert(healthMemoriesTable).values({
        userId: user.id,
        category: "habits",
        observation: "User completes morning habits consistently.",
        source: "system",
      });
    }

  } catch (err) {
    console.error("Failed to generate memories:", err);
  }
}

router.get("/memories", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);

  // Generate system observations dynamically
  await analyzeAndGenerateMemories(user);

  const memories = await db
    .select()
    .from(healthMemoriesTable)
    .where(eq(healthMemoriesTable.userId, user.id))
    .orderBy(desc(healthMemoriesTable.createdAt))
    .limit(50);

  res.json(memories);
});

router.post("/memories", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const parsed = CreateMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [memory] = await db
    .insert(healthMemoriesTable)
    .values({
      userId: user.id,
      category: parsed.data.category,
      observation: parsed.data.observation,
      source: parsed.data.source,
    })
    .returning();

  res.status(201).json(memory);
});

export default router;
