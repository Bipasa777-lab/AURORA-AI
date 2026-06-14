import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { UpsertProfileBody } from "@workspace/api-zod";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  res.json({
    id: user.id,
    clerkId: user.clerkId,
    name: user.name,
    age: user.age,
    gender: user.gender,
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    wakeUpTime: user.wakeUpTime,
    bedtime: user.bedtime,
    activityLevel: user.activityLevel,
    goals: user.goals || [],
    dailyWaterGoalMl: user.dailyWaterGoalMl,
    dailySleepGoalHours: user.dailySleepGoalHours,
    onboardingCompleted: user.onboardingCompleted,
    preferences: user.preferences,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

router.put("/me", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const parsed = UpsertProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = await getOrCreateUser(clerkId);

  const [updated] = await db
    .update(usersTable)
    .set({
      name: parsed.data.name ?? user.name,
      age: parsed.data.age ?? user.age,
      gender: parsed.data.gender ?? user.gender,
      heightCm: parsed.data.heightCm ?? user.heightCm,
      weightKg: parsed.data.weightKg ?? user.weightKg,
      wakeUpTime: parsed.data.wakeUpTime ?? user.wakeUpTime,
      bedtime: parsed.data.bedtime ?? user.bedtime,
      activityLevel: parsed.data.activityLevel ?? user.activityLevel,
      goals: parsed.data.goals ?? user.goals,
      dailyWaterGoalMl: parsed.data.dailyWaterGoalMl ?? user.dailyWaterGoalMl,
      dailySleepGoalHours: parsed.data.dailySleepGoalHours ?? user.dailySleepGoalHours,
      onboardingCompleted: parsed.data.onboardingCompleted ?? user.onboardingCompleted,
      preferences: parsed.data.preferences ?? user.preferences,
    })
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json({
    id: updated.id,
    clerkId: updated.clerkId,
    name: updated.name,
    age: updated.age,
    gender: updated.gender,
    heightCm: updated.heightCm,
    weightKg: updated.weightKg,
    wakeUpTime: updated.wakeUpTime,
    bedtime: updated.bedtime,
    activityLevel: updated.activityLevel,
    goals: updated.goals || [],
    dailyWaterGoalMl: updated.dailyWaterGoalMl,
    dailySleepGoalHours: updated.dailySleepGoalHours,
    onboardingCompleted: updated.onboardingCompleted,
    preferences: updated.preferences,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
});

export default router;
