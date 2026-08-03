import type { APIRoute } from "astro";
import { db } from "@/db/client";
import { prayerIntentions } from "@/db/schema";
import { checkRateLimit } from "@/lib/rateLimit";

export const prerender = false;

const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 15 * 60 * 1000;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.prayer !== "string" || !body.prayer.trim()) {
    return new Response(
      JSON.stringify({ error: "La intención de oración es obligatoria." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Honeypot: real visitors never see or fill this field. Bots that auto-fill
  // every input do, so we silently pretend success without saving anything.
  if (typeof body.company === "string" && body.company.trim()) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  let ip = "unknown";
  try {
    ip = clientAddress || "unknown";
  } catch {
    ip = "unknown";
  }

  const allowed = await checkRateLimit(`oracion:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Demasiados envíos. Intenta de nuevo en unos minutos." }),
      { status: 429, headers: { "Content-Type": "application/json" } },
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
