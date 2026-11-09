import { NextResponse } from "next/server";
import { apiLocale, refuseWithoutKey } from "../../../lib/apikey";
import { TEMPLATES, type TemplateId } from "../../../lib/templates";

/** GET /api/templates: the templates a request can ask for, with the formats each one draws. */
export async function GET(request: Request) {
  const refused = refuseWithoutKey(request);
  if (refused) return refused;
  const locale = apiLocale(request);
  return NextResponse.json({
    templates: (Object.keys(TEMPLATES) as TemplateId[]).map((id) => ({
      id,
      name: TEMPLATES[id].name[locale],
      description: TEMPLATES[id].description[locale],
      formats: TEMPLATES[id].formats,
    })),
  });
}
