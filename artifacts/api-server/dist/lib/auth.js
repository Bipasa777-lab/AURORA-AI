import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
export const requireAuth = (req, res, next) => {
    const bypass = process.env.BYPASS_CLERK === "true" ||
        !process.env.CLERK_SECRET_KEY ||
        process.env.CLERK_SECRET_KEY.includes("dummy");
    if (bypass) {
        const mockEmail = (req.headers["x-mock-user-email"] || "").trim();
        req.clerkId = mockEmail || "user_mock_123";
        next();
        return;
    }
    const auth = getAuth(req);
    const userId = auth?.sessionClaims?.userId || auth?.userId;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    req.clerkId = userId;
    next();
};
export async function getOrCreateUser(clerkId, name) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
    if (existing[0])
        return existing[0];
    const [created] = await db.insert(usersTable).values({
        clerkId,
        name: name || "Aurora User",
        goals: [],
    }).returning();
    return created;
}
