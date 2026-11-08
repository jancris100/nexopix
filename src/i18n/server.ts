import { cookies, headers } from "next/headers";
import { dictionaryFor } from "./dictionaries";
import { LOCALE_COOKIE, pickLocale } from "./locale";

/** The language of this visit: the saved choice, or the browser's language, or English. */
export async function getLocale() {
  const [jar, list] = await Promise.all([cookies(), headers()]);
  return pickLocale(jar.get(LOCALE_COOKIE)?.value, list.get("accept-language"));
}

export async function getDictionary() {
  return dictionaryFor(await getLocale());
}
