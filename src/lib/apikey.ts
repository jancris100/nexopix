import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { issueMessage, type ApiErrorCode } from "../i18n/issues";
import { pickLocale, type Locale } from "../i18n/locale";
import type { Issue } from "./gatekeeper";

const digest = (value: string) => createHash("sha256").update(value).digest();

/** The API answers in English unless the caller asks for Spanish with Accept-Language: es. */
export const apiLocale = (request: Request): Locale => pickLocale(null, request.headers.get("accept-language"));

/** Every error has the same shape: a stable code for programs and a message for people. */
export function apiError(request: Request, status: number, issue: Issue | { code: ApiErrorCode; params?: Record<string, string | number> }) {
  return NextResponse.json({ error: { code: issue.code, message: issueMessage(issue, apiLocale(request)) } }, { status });
}

/** Systems outside the panel (INTENEXO among them) identify themselves with the x-api-key header. */
export function refuseWithoutKey(request: Request) {
  const key = process.env.NEXOPIX_API_KEY;
  if (!key) return apiError(request, 503, { code: "api_disabled" });
  if (!timingSafeEqual(digest(request.headers.get("x-api-key") ?? ""), digest(key))) return apiError(request, 401, { code: "invalid_key" });
  return null;
}
