import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { rateLimits } from "@/db/schema";

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const [existing] = await db.select().from(rateLimits).where(eq(rateLimits.key, key));

  if (!existing || now - Number(existing.windowStart) > windowMs) {
    await db
      .insert(rateLimits)
      .values({ key, count: 1, windowStart: String(now) })
      .onConflictDoUpdate({ target: rateLimits.key, set: { count: 1, windowStart: String(now) } });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  await db
    .update(rateLimits)
    .set({ count: existing.count + 1 })
    .where(eq(rateLimits.key, key));
  return true;
}
