import { NextResponse } from "next/server";
import { sameText } from "../../../lib/secure";
import { isProtected, panelPassword, SESSION_COOKIE, sessionValue } from "../../../lib/session";

/** POST /api/sesion: the login form. Sets the session cookie when the password matches. */
export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  if (!isProtected()) return NextResponse.redirect(new URL("/panel", request.url), 303);
  if (!sameText(password, panelPassword())) return NextResponse.redirect(new URL("/entrar?error=1", request.url), 303);
  const response = NextResponse.redirect(new URL("/panel", request.url), 303);
  response.cookies.set(SESSION_COOKIE, await sessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

/** DELETE /api/sesion: closes the session. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
