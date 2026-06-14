import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { requireAuth, getOrCreateUser } from "../lib/auth";

const router = Router();

// GET /notifications
router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  try {
    const clerkId = (req as any).clerkId;
    const user = await getOrCreateUser(clerkId);

    const list = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, user.id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /notifications/:id/read
router.post("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  try {
    const clerkId = (req as any).clerkId;
    const user = await getOrCreateUser(clerkId);
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);

    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /notifications/read-all
router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  try {
    const clerkId = (req as any).clerkId;
    const user = await getOrCreateUser(clerkId);

    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, user.id));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
