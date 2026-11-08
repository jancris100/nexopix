import { NextResponse } from "next/server";
import { refuseWithoutKey } from "../../../lib/apikey";
import { publicAccounts } from "../../../lib/panel";

/** GET /api/accounts: the accounts a sender can ask content for, with the formats each one takes. */
export async function GET(request: Request) {
  const refused = refuseWithoutKey(request);
  if (refused) return refused;
  return NextResponse.json({ accounts: await publicAccounts() });
}
