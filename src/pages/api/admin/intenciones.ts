import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { prayerIntentions } from "@/db/schema";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const id = Number(form.get("id"));
  const usedInEpisode = form.get("usedInEpisode") === "true";

  if (!id) {
    return new Response(null, { status: 400 });
  }

  await db.update(prayerIntentions).set({ usedInEpisode }).where(eq(prayerIntentions.id, id));

  return new Response(null, { status: 204 });
};
