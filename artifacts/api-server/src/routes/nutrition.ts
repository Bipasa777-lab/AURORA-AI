import { Router } from "express";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { db, mealLogsTable } from "@workspace/db";
import { CreateMealLogBody, UpdateMealLogBody, UpdateMealLogParams, DeleteMealLogParams } from "@workspace/api-zod";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

router.get("/nutrition/today", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const meals = await db
    .select()
    .from(mealLogsTable)
    .where(and(
      eq(mealLogsTable.userId, user.id),
      gte(mealLogsTable.loggedAt, today),
      lt(mealLogsTable.loggedAt, tomorrow)
    ))
    .orderBy(mealLogsTable.loggedAt);

  const totalCalories = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const totalProteinG = meals.reduce((s, m) => s + (m.proteinG ?? 0), 0);
  const totalCarbsG = meals.reduce((s, m) => s + (m.carbsG ?? 0), 0);
  const totalFatG = meals.reduce((s, m) => s + (m.fatG ?? 0), 0);

  res.json({
    date: today.toISOString().split("T")[0],
    mealsLogged: meals.length,
    totalCalories,
    totalProteinG: Math.round(totalProteinG * 10) / 10,
    totalCarbsG: Math.round(totalCarbsG * 10) / 10,
    totalFatG: Math.round(totalFatG * 10) / 10,
    meals,
  });
});

router.get("/meals", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);

  const dateStr = req.query.date as string | undefined;
  let conditions = [eq(mealLogsTable.userId, user.id)];

  if (dateStr) {
    const day = new Date(dateStr);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    conditions.push(gte(mealLogsTable.loggedAt, day));
    conditions.push(lt(mealLogsTable.loggedAt, nextDay));
  }

  const meals = await db
    .select()
    .from(mealLogsTable)
    .where(and(...conditions))
    .orderBy(desc(mealLogsTable.loggedAt));

  res.json(meals);
});

router.post("/meals", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const parsed = CreateMealLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [meal] = await db
    .insert(mealLogsTable)
    .values({
      userId: user.id,
      mealType: parsed.data.mealType,
      name: parsed.data.name,
      calories: parsed.data.calories,
      proteinG: parsed.data.proteinG,
      carbsG: parsed.data.carbsG,
      fatG: parsed.data.fatG,
      notes: parsed.data.notes,
      loggedAt: parsed.data.loggedAt ? new Date(parsed.data.loggedAt) : new Date(),
    })
    .returning();

  res.status(201).json(meal);
});

router.patch("/meals/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const parsed = UpdateMealLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(mealLogsTable)
    .set(parsed.data)
    .where(and(eq(mealLogsTable.id, id), eq(mealLogsTable.userId, user.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/meals/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [deleted] = await db
    .delete(mealLogsTable)
    .where(and(eq(mealLogsTable.id, id), eq(mealLogsTable.userId, user.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
