import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, vitalsLogsTable } from "@workspace/db";
import { ListVitalsQueryParams, CreateVitalsLogBody } from "@workspace/api-zod";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

router.get("/vitals", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const params = ListVitalsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const limit = params.data.limit ?? 50;
  const logs = await db
    .select()
    .from(vitalsLogsTable)
    .where(eq(vitalsLogsTable.userId, user.id))
    .orderBy(desc(vitalsLogsTable.loggedAt))
    .limit(limit);

  res.json(logs);
});

router.post("/vitals", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const parsed = CreateVitalsLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const loggedAt = parsed.data.loggedAt ? new Date(parsed.data.loggedAt) : new Date();

  const [log] = await db
    .insert(vitalsLogsTable)
    .values({
      userId: user.id,
      systolic: parsed.data.systolic ?? null,
      diastolic: parsed.data.diastolic ?? null,
      heartRate: parsed.data.heartRate ?? null,
      temperature: parsed.data.temperature ?? null,
      weight: parsed.data.weight ?? null,
      symptoms: parsed.data.symptoms ?? [],
      notes: parsed.data.notes ?? null,
      loggedAt,
    })
    .returning();

  res.status(201).json(log);
});

export default router;
