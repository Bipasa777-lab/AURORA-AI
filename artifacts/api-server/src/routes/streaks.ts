import { Router } from "express";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { db, hydrationLogsTable, sleepLogsTable, habitsTable, mealLogsTable } from "@workspace/db";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

async function calcStreak(type: string, userId: number, goalMl?: number, goalHours?: number) {
  let currentStreak = 0;
  let longestStreak = 0;
  let lastActiveDate: string | null = null;

  const today = new Date();

  for (let i = 0; i < 90; i++) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const dateStr = day.toISOString().split("T")[0];

    let achieved = false;

    if (type === "hydration" && goalMl) {
      const logs = await db.select().from(hydrationLogsTable)
        .where(and(eq(hydrationLogsTable.userId, userId), gte(hydrationLogsTable.loggedAt, day), lt(hydrationLogsTable.loggedAt, nextDay)));
      const total = logs.reduce((s, l) => s + l.amountMl, 0);
      achieved = total >= goalMl * 0.8;
    } else if (type === "sleep" && goalHours) {
      const logs = await db.select().from(sleepLogsTable)
        .where(and(eq(sleepLogsTable.userId, userId), eq(sleepLogsTable.sleepDate, dateStr)));
      achieved = logs.some(l => l.durationHours >= goalHours * 0.85);
    } else if (type === "nutrition") {
      const logs = await db.select().from(mealLogsTable)
        .where(and(eq(mealLogsTable.userId, userId), gte(mealLogsTable.loggedAt, day), lt(mealLogsTable.loggedAt, nextDay)));
      achieved = logs.length >= 2;
    }

    if (achieved) {
      if (i === 0 || currentStreak > 0) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
        if (!lastActiveDate) lastActiveDate = dateStr;
      }
    } else {
      if (i > 0) break;
    }
  }

  return { type, currentStreak, longestStreak, lastActiveDate };
}

router.get("/streaks", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);

  const habits = await db.select().from(habitsTable)
    .where(and(eq(habitsTable.userId, user.id), eq(habitsTable.status, "active")));

  const maxHabitStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak), 0);
  const maxHabitLongest = habits.reduce((max, h) => Math.max(max, h.longestStreak), 0);
  const totalCompletions = habits.reduce((s, h) => s + h.totalCompletions, 0);

  const [hydration, sleep, nutrition] = await Promise.all([
    calcStreak("hydration", user.id, user.dailyWaterGoalMl),
    calcStreak("sleep", user.id, undefined, user.dailySleepGoalHours),
    calcStreak("nutrition", user.id),
  ]);

  const achievements = [
    { id: "first_water", title: "First Drop", description: "Log your first water intake", icon: "💧", earned: totalCompletions > 0 || hydration.currentStreak > 0, earnedAt: null },
    { id: "hydration_7", title: "Hydration Hero", description: "Hit your water goal 7 days in a row", icon: "🏆", earned: hydration.longestStreak >= 7, earnedAt: null },
    { id: "sleep_5", title: "Sleep Champion", description: "Meet your sleep goal 5 nights in a row", icon: "🌙", earned: sleep.longestStreak >= 5, earnedAt: null },
    { id: "habit_10", title: "Habit Builder", description: "Complete a habit 10 times", icon: "⭐", earned: totalCompletions >= 10, earnedAt: null },
    { id: "streak_30", title: "Month Master", description: "Maintain any streak for 30 days", icon: "🔥", earned: Math.max(hydration.longestStreak, sleep.longestStreak, maxHabitLongest) >= 30, earnedAt: null },
    { id: "all_logged", title: "Complete Day", description: "Log water, sleep, a habit, and a meal in one day", icon: "✅", earned: false, earnedAt: null },
  ];

  res.json({
    hydration,
    sleep,
    habits: { type: "habits", currentStreak: maxHabitStreak, longestStreak: maxHabitLongest, lastActiveDate: null },
    nutrition,
    achievements,
    totalActiveStreaks: [hydration, sleep, nutrition].filter(s => s.currentStreak > 0).length + (maxHabitStreak > 0 ? 1 : 0),
  });
});

export default router;
