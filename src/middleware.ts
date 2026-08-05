import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { isFuture, slugToIso } from "@/lib/dates";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const dailyPrayerMatch = pathname.match(/^\/oraciones\/oracion-para-iniciar-el-dia\/([^/]+)\/?$/);
  if (dailyPrayerMatch) {
    const iso = slugToIso(dailyPrayerMatch[1]);
    if (iso && isFuture(iso)) {
      return context.redirect("/oraciones/oracion-para-iniciar-el-dia");
    }
  }

  const closingPrayerMatch = pathname.match(/^\/oraciones\/oracion-para-terminar-el-dia\/([^/]+)\/?$/);
  if (closingPrayerMatch) {
    const iso = slugToIso(closingPrayerMatch[1]);
    if (iso && isFuture(iso)) {
      return context.redirect("/oraciones/oracion-para-terminar-el-dia");
    }
  }

  const isProtectedPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isProtectedApi = pathname.startsWith("/api/admin");

  if (!isProtectedPage && !isProtectedApi) {
    return next();
  }

  const token = context.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isValid = await verifySessionToken(token);

  if (!isValid) {
    if (isProtectedApi) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return context.redirect("/admin/login");
  }

  return next();
});
