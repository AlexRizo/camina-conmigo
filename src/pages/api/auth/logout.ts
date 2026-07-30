import type { APIRoute } from "astro";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export const prerender = false;

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
  return redirect("/admin/login");
};
