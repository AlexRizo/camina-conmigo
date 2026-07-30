import type { APIRoute } from "astro";
import { db } from "@/db/client";
import { prayerIntentions } from "@/db/schema";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.prayer !== "string" || !body.prayer.trim()) {
    return new Response(
      JSON.stringify({ error: "La intención de oración es obligatoria." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const anonymous = Boolean(body.anonymous);

  await db.insert(prayerIntentions).values({
    name: anonymous ? null : body.name || null,
    email: anonymous ? null : body.email || null,
    prayer: body.prayer.trim(),
    anonymous,
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
