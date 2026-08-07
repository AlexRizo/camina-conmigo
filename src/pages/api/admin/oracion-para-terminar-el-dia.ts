import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { closingPrayers } from "@/db/schema";
import { toSlug } from "@/lib/dates";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const id = String(form.get("id") || "").trim();
  const date = String(form.get("date") || "").trim();
  const title = String(form.get("title") || "").trim();
  const subtitle = String(form.get("subtitle") || "").trim();
  const description = String(form.get("description") || "").trim();
  const quote = String(form.get("quote") || "").trim();
  const source = String(form.get("source") || "").trim();

  if (!date || !title || !description) {
    return redirect("/admin/oracion-para-terminar-el-dia?error=missing");
  }

  try {
    if (id) {
      await db
        .update(closingPrayers)
        .set({
          date,
          slug: toSlug(date),
          title,
          subtitle: subtitle || null,
          description,
          quote: quote || null,
          source: source || null,
        })
        .where(eq(closingPrayers.id, Number(id)));
    } else {
      await db.insert(closingPrayers).values({
        date,
        slug: toSlug(date),
        title,
        subtitle: subtitle || null,
        description,
        quote: quote || null,
        source: source || null,
      });
    }
  } catch {
    return redirect("/admin/oracion-para-terminar-el-dia?error=duplicate");
  }

  return redirect("/admin/oracion-para-terminar-el-dia?success=1");
};

export const DELETE: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const id = String(form.get("id") || "").trim();

  if (!id) {
    return redirect("/admin/oracion-para-terminar-el-dia?error=missing");
  }

  await db.delete(closingPrayers).where(eq(closingPrayers.id, Number(id)));

  return redirect("/admin/oracion-para-terminar-el-dia?deleted=1");
};
