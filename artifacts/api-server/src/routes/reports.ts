import { Router } from "express";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { db, hydrationLogsTable, sleepLogsTable, habitsTable, habitLogsTable, mealLogsTable } from "@workspace/db";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

router.get("/reports/weekly", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(now);
  weekEnd.setHours(23, 59, 59, 999);

  // Hydration
  let hydrationGoalDays = 0;
  let totalHydrationMl = 0;
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const logs = await db.select().from(hydrationLogsTable)
      .where(and(eq(hydrationLogsTable.userId, user.id), gte(hydrationLogsTable.loggedAt, day), lt(hydrationLogsTable.loggedAt, nextDay)));
    const total = logs.reduce((s, l) => s + l.amountMl, 0);
    totalHydrationMl += total;
    if (total >= user.dailyWaterGoalMl * 0.8) hydrationGoalDays++;
  }

  // Sleep
  const sleepLogs = await db.select().from(sleepLogsTable)
    .where(and(eq(sleepLogsTable.userId, user.id), gte(sleepLogsTable.bedtime, weekStart), lt(sleepLogsTable.bedtime, weekEnd)));
  const avgSleep = sleepLogs.length > 0 ? sleepLogs.reduce((s, l) => s + l.durationHours, 0) / sleepLogs.length : 0;
  const onTargetSleep = sleepLogs.filter(l => l.durationHours >= user.dailySleepGoalHours * 0.85).length;
  const sleepConsistency = sleepLogs.length > 0 ? Math.round((onTargetSleep / sleepLogs.length) * 100) : 0;

  // Habits
  const habits = await db.select().from(habitsTable)
    .where(and(eq(habitsTable.userId, user.id), eq(habitsTable.status, "active")));
  const habitLogs = await db.select().from(habitLogsTable)
    .where(and(eq(habitLogsTable.userId, user.id), gte(habitLogsTable.createdAt, weekStart)));
  const completedHabitLogs = habitLogs.filter(l => l.status === "completed");
  const totalPossibleHabits = habits.length * 7;
  const completionRate = totalPossibleHabits > 0 ? Math.round((completedHabitLogs.length / totalPossibleHabits) * 100) : 0;

  // Nutrition
  const mealLogs = await db.select().from(mealLogsTable)
    .where(and(eq(mealLogsTable.userId, user.id), gte(mealLogsTable.loggedAt, weekStart)));
  const avgCalories = mealLogs.length > 0 ? Math.round(mealLogs.reduce((s, m) => s + (m.calories ?? 0), 0) / 7) : 0;
  const daysWithMeals = new Set(mealLogs.map(m => m.loggedAt.toISOString().split("T")[0])).size;

  const consistencyScore = Math.round((hydrationGoalDays / 7 * 25) + (sleepConsistency / 100 * 25) + (completionRate / 100 * 25) + (daysWithMeals / 7 * 25));

  const highlights: string[] = [];
  if (hydrationGoalDays >= 5) highlights.push(`Hit hydration goal ${hydrationGoalDays} out of 7 days!`);
  if (avgSleep >= user.dailySleepGoalHours) highlights.push(`Averaged ${avgSleep.toFixed(1)}h sleep — on target!`);
  if (completionRate >= 70) highlights.push(`${completionRate}% habit completion rate this week.`);

  res.json({
    weekStart: weekStart.toISOString().split("T")[0],
    weekEnd: weekEnd.toISOString().split("T")[0],
    hydration: { avgDailyMl: Math.round(totalHydrationMl / 7), goalAchievedDays: hydrationGoalDays, totalDays: 7 },
    sleep: { avgHours: Math.round(avgSleep * 10) / 10, consistency: sleepConsistency, bestDay: null },
    habits: { completionRate, totalCompleted: completedHabitLogs.length, totalPossible: totalPossibleHabits },
    nutrition: { avgCalories, mealsLoggedDays: daysWithMeals },
    consistencyScore,
    highlights: highlights.length > 0 ? highlights : ["Keep logging your health data to see weekly highlights!"],
  });
});

router.get("/reports/monthly", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysPassed = now.getDate();

  const sleepLogs = await db.select().from(sleepLogsTable)
    .where(and(eq(sleepLogsTable.userId, user.id), gte(sleepLogsTable.bedtime, monthStart)));
  const sleepGoalDays = sleepLogs.filter(l => l.durationHours >= user.dailySleepGoalHours * 0.85).length;

  let hydrationGoalDays = 0;
  let totalHydrationMl = 0;
  for (let i = 0; i < daysPassed; i++) {
    const day = new Date(monthStart);
    day.setDate(day.getDate() + i);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const logs = await db.select().from(hydrationLogsTable)
      .where(and(eq(hydrationLogsTable.userId, user.id), gte(hydrationLogsTable.loggedAt, day), lt(hydrationLogsTable.loggedAt, nextDay)));
    const total = logs.reduce((s, l) => s + l.amountMl, 0);
    totalHydrationMl += total;
    if (total >= user.dailyWaterGoalMl * 0.8) hydrationGoalDays++;
  }

  const habits = await db.select().from(habitsTable)
    .where(and(eq(habitsTable.userId, user.id), eq(habitsTable.status, "active")));
  const habitLogs = await db.select().from(habitLogsTable)
    .where(and(eq(habitLogsTable.userId, user.id), gte(habitLogsTable.createdAt, monthStart)));
  const completedLogs = habitLogs.filter(l => l.status === "completed");
  const possibleTotal = habits.length * daysPassed;
  const habitConsistency = possibleTotal > 0 ? Math.round((completedLogs.length / possibleTotal) * 100) : 0;

  const mealLogs = await db.select().from(mealLogsTable)
    .where(and(eq(mealLogsTable.userId, user.id), gte(mealLogsTable.loggedAt, monthStart)));
  const daysWithMeals = new Set(mealLogs.map(m => m.loggedAt.toISOString().split("T")[0])).size;

  const consistencyScore = Math.round(
    (hydrationGoalDays / daysPassed * 25) +
    (sleepGoalDays / daysPassed * 25) +
    (habitConsistency / 100 * 25) +
    (daysWithMeals / daysPassed * 25)
  );

  // Behavior Trends
  const behaviorTrends: string[] = [];
  behaviorTrends.push(`Hydration: You logged water on ${hydrationGoalDays} out of ${daysPassed} days this month.`);

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
  if (weekendSleep.length >= 2 && weekdaySleep.length >= 3) {
    const avgWeekend = weekendSleep.reduce((s, d) => s + d, 0) / weekendSleep.length;
    const avgWeekday = weekdaySleep.reduce((s, d) => s + d, 0) / weekdaySleep.length;
    if (avgWeekend - avgWeekday >= 1.5) {
      behaviorTrends.push(`Sleep Pattern: You sleep on average ${(avgWeekend - avgWeekday).toFixed(1)} hours more on weekends.`);
    } else {
      behaviorTrends.push(`Sleep Consistency: Your sleep duration averages ${(avgWeekday).toFixed(1)} hours on weekdays.`);
    }
  }

  if (habits.length > 0) {
    behaviorTrends.push(`Habits: You achieved a ${habitConsistency}% overall completion rate for active habits.`);
  }

  // Areas for Improvement
  const areasForImprovement: string[] = [];
  if (hydrationGoalDays / daysPassed < 0.6) {
    areasForImprovement.push("Hydration: Try drinking a glass of water immediately after waking up to build consistency.");
  }
  if (sleepGoalDays / daysPassed < 0.6) {
    areasForImprovement.push("Sleep: Try setting a bedtime reminder to wind down at the same time each night.");
  }
  if (habitConsistency < 60) {
    areasForImprovement.push("Habits: Pick your 1-2 most important habits and aim to complete them early in the day.");
  }
  if (areasForImprovement.length === 0) {
    areasForImprovement.push("No critical areas for improvement! Keep up the excellent work.");
  }

  // Achievements Earned
  const totalCompletions = habits.reduce((s, h) => s + h.totalCompletions, 0);
  const achievements = [
    { id: "first_water", title: "First Drop", description: "Log your first water intake", icon: "💧", earned: totalCompletions > 0 || hydrationGoalDays > 0, earnedAt: null },
    { id: "hydration_7", title: "Hydration Hero", description: "Hit your water goal 7 days in a row", icon: "🏆", earned: hydrationGoalDays >= 7, earnedAt: null },
    { id: "sleep_5", title: "Sleep Champion", description: "Meet your sleep goal 5 nights in a row", icon: "🌙", earned: sleepGoalDays >= 5, earnedAt: null },
    { id: "habit_10", title: "Habit Builder", description: "Complete a habit 10 times", icon: "⭐", earned: totalCompletions >= 10, earnedAt: null },
  ].filter(a => a.earned);

  res.json({
    month: monthStart.toISOString().substring(0, 7),
    hydrationGoalDays,
    sleepGoalDays,
    habitConsistency,
    consistencyScore,
    achievements,
    behaviorTrends,
    areasForImprovement,
  });
});

export default router;
