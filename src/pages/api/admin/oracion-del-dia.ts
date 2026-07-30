import type { APIRoute } from "astro";
import { db } from "@/db/client";
import { dailyPrayers } from "@/db/schema";
import { toSlug } from "@/lib/dates";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const date = String(form.get("date") || "").trim();
  const title = String(form.get("title") || "").trim();
  const subtitle = String(form.get("subtitle") || "").trim();
  const description = String(form.get("description") || "").trim();
  const source = String(form.get("source") || "").trim();

  if (!date || !title || !description) {
    return redirect("/admin/oracion-del-dia?error=missing");
  }

  try {
    await db.insert(dailyPrayers).values({
      date,
      slug: toSlug(date),
      title,
      subtitle: subtitle || null,
      description,
      source: source || null,
    });
  } catch {
    return redirect("/admin/oracion-del-dia?error=duplicate");
  }

  return redirect("/admin/oracion-del-dia?success=1");
};
