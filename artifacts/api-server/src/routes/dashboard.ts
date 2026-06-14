import { Router } from "express";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { db, hydrationLogsTable, sleepLogsTable, habitsTable, habitLogsTable, mealLogsTable, notificationsTable } from "@workspace/db";
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

router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayStr = today.toISOString().split("T")[0];

  // Hydration today
  const hydrationLogs = await db.select().from(hydrationLogsTable)
    .where(and(eq(hydrationLogsTable.userId, user.id), gte(hydrationLogsTable.loggedAt, today), lt(hydrationLogsTable.loggedAt, tomorrow)));
  const totalMl = hydrationLogs.reduce((s, l) => s + l.amountMl, 0);
  const goalMl = user.dailyWaterGoalMl;

  // Sleep
  const recentSleep = await db.select().from(sleepLogsTable)
    .where(eq(sleepLogsTable.userId, user.id))
    .orderBy(desc(sleepLogsTable.sleepDate))
    .limit(8);
  const lastNight = recentSleep[0];
  const weekly = recentSleep.slice(0, 7);
  const weeklyAvg = weekly.length > 0 ? weekly.reduce((s, l) => s + l.durationHours, 0) / weekly.length : 0;
  const goalHours = user.dailySleepGoalHours;
  const onTargetDays = weekly.filter(l => l.durationHours >= goalHours * 0.85).length;
  const consistency = weekly.length > 0 ? Math.round((onTargetDays / weekly.length) * 100) : 0;

  // Habits today
  const habits = await db.select().from(habitsTable)
    .where(and(eq(habitsTable.userId, user.id), eq(habitsTable.status, "active")));
  const todayHabitLogs = await db.select().from(habitLogsTable)
    .where(and(eq(habitLogsTable.userId, user.id), eq(habitLogsTable.logDate, todayStr)));
  const completedHabits = todayHabitLogs.filter(l => l.status === "completed").length;

  // Nutrition today
  const meals = await db.select().from(mealLogsTable)
    .where(and(eq(mealLogsTable.userId, user.id), gte(mealLogsTable.loggedAt, today), lt(mealLogsTable.loggedAt, tomorrow)));
  const totalCalories = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const totalProteinG = meals.reduce((s, m) => s + (m.proteinG ?? 0), 0);
  const totalCarbsG = meals.reduce((s, m) => s + (m.carbsG ?? 0), 0);
  const totalFatG = meals.reduce((s, m) => s + (m.fatG ?? 0), 0);

  // Generate insight
  let insight = `Good morning, ${user.name.split(" ")[0]}! Let's make today count.`;
  if (totalMl < goalMl * 0.3 && new Date().getHours() > 10) {
    insight = `You've only had ${Math.round(totalMl / 1000 * 10) / 10}L today. Don't forget to hydrate!`;
  } else if (lastNight && lastNight.durationHours < (user.dailySleepGoalHours || 8) * 0.8) {
    insight = `You slept ${lastNight.durationHours.toFixed(1)}h last night — less than your goal. Prioritize rest today.`;
  } else if (habits.length > 0 && completedHabits === habits.length) {
    insight = `All habits done for today! You're on a roll.`;
  } else if (totalMl >= goalMl) {
    insight = `Hydration goal crushed! Keep up the great momentum.`;
  }

  // Bedtime check (within 1 hour of user bedtime, once per day)
  if (user.bedtime) {
    try {
      const [bHour, bMinute] = user.bedtime.split(":").map(Number);
      const currentHour = new Date().getHours();
      const diff = bHour - currentHour;
      if (diff >= 0 && diff <= 1) {
        // Bedtime routine notification check
        const todayStart = new Date(today);
        const notificationExists = await db.select().from(notificationsTable).where(
          and(
            eq(notificationsTable.userId, user.id),
            eq(notificationsTable.type, "sleep"),
            eq(notificationsTable.message, "You usually begin your bedtime routine around this time."),
            gte(notificationsTable.createdAt, todayStart)
          )
        );
        if (notificationExists.length === 0) {
          const alreadyLoggedSleep = await db.select().from(sleepLogsTable).where(
            and(
              eq(sleepLogsTable.userId, user.id),
              eq(sleepLogsTable.sleepDate, todayStr)
            )
          );
          if (alreadyLoggedSleep.length === 0) {
            await db.insert(notificationsTable).values({
              userId: user.id,
              type: "sleep",
              message: "You usually begin your bedtime routine around this time.",
            });
          }
        }
      }
    } catch (err) {
      // ignore parsing error
    }
  }

  // Calculate actual streaks
  const maxHabitStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak), 0);
  const maxHabitLongest = habits.reduce((max, h) => Math.max(max, h.longestStreak), 0);
  const totalCompletions = habits.reduce((s, h) => s + h.totalCompletions, 0);

  const [hydrationStreak, sleepStreak, nutritionStreak] = await Promise.all([
    calcStreak("hydration", user.id, user.dailyWaterGoalMl),
    calcStreak("sleep", user.id, undefined, user.dailySleepGoalHours),
    calcStreak("nutrition", user.id),
  ]);

  const totalActiveStreaks = [hydrationStreak, sleepStreak, nutritionStreak].filter(s => s.currentStreak > 0).length + (maxHabitStreak > 0 ? 1 : 0);

  const achievements = [
    { id: "first_water", title: "First Drop", description: "Log your first water intake", icon: "💧", earned: totalCompletions > 0 || hydrationStreak.currentStreak > 0, earnedAt: null },
    { id: "hydration_7", title: "Hydration Hero", description: "Hit your water goal 7 days in a row", icon: "🏆", earned: hydrationStreak.longestStreak >= 7, earnedAt: null },
    { id: "sleep_5", title: "Sleep Champion", description: "Meet your sleep goal 5 nights in a row", icon: "🌙", earned: sleepStreak.longestStreak >= 5, earnedAt: null },
    { id: "habit_10", title: "Habit Builder", description: "Complete a habit 10 times", icon: "⭐", earned: totalCompletions >= 10, earnedAt: null },
    { id: "streak_30", title: "Month Master", description: "Maintain any streak for 30 days", icon: "🔥", earned: Math.max(hydrationStreak.longestStreak, sleepStreak.longestStreak, maxHabitLongest) >= 30, earnedAt: null },
    { id: "all_logged", title: "Complete Day", description: "Log water, sleep, a habit, and a meal in one day", icon: "✅", earned: false, earnedAt: null },
  ];

  res.json({
    hydration: {
      totalMl,
      goalMl,
      remainingMl: Math.max(0, goalMl - totalMl),
      percentComplete: Math.min(100, Math.round((totalMl / goalMl) * 100)),
      logsToday: hydrationLogs.length,
    },
    sleep: {
      lastNightHours: lastNight?.durationHours ?? null,
      weeklyAvgHours: Math.round(weeklyAvg * 10) / 10,
      consistency,
      lastSleepDate: lastNight?.sleepDate ?? null,
    },
    habits: {
      totalToday: habits.length,
      completedToday: completedHabits,
      progressPercent: habits.length > 0 ? Math.round((completedHabits / habits.length) * 100) : 0,
    },
    nutrition: {
      date: todayStr,
      mealsLogged: meals.length,
      totalCalories,
      totalProteinG: Math.round(totalProteinG * 10) / 10,
      totalCarbsG: Math.round(totalCarbsG * 10) / 10,
      totalFatG: Math.round(totalFatG * 10) / 10,
      meals,
    },
    streaks: {
      hydration: hydrationStreak,
      sleep: sleepStreak,
      habits: { type: "habits", currentStreak: maxHabitStreak, longestStreak: maxHabitLongest, lastActiveDate: null },
      nutrition: nutritionStreak,
      achievements,
      totalActiveStreaks,
    },
    dailyInsight: insight,
    date: todayStr,
  });
});

export default router;
