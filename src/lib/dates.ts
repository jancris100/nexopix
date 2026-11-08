const costaRica = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica" });

/** Today as YYYY-MM-DD in Costa Rica: the servers run in UTC. */
export const todayInCostaRica = (now = new Date()) => costaRica.format(now);

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function mondayOf(date: string) {
  const weekday = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}

export const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));

/** Week 1 is the first week with publications; the weeks after it count from there. */
export function weekNumber(firstWeek: string, weekStart: string) {
  const days = (Date.parse(`${weekStart}T12:00:00Z`) - Date.parse(`${firstWeek}T12:00:00Z`)) / 86_400_000;
  return Math.round(days / 7) + 1;
}

type Lang = "es" | "en";
const TAG: Record<Lang, string> = { es: "es-CR", en: "en-US" };
const at = (date: string) => new Date(`${date}T12:00:00Z`);
const fmt = (lang: Lang, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(TAG[lang], { ...options, timeZone: "UTC" });
const clean = (text: string) => text.replace(/\./g, "");

/** "10 al 16 nov" or "Nov 10 to 16"; across months, "29 dic al 4 ene" or "Dec 29 to Jan 4". */
export function weekRange(weekStart: string, lang: Lang = "es") {
  const first = at(weekStart);
  const last = at(addDays(weekStart, 6));
  const sameMonth = first.getUTCMonth() === last.getUTCMonth();
  const dayMonth = fmt(lang, { day: "numeric", month: "short" });
  const day = fmt(lang, { day: "numeric" });
  if (lang === "es") return clean(`${sameMonth ? day.format(first) : dayMonth.format(first)} al ${dayMonth.format(last)}`);
  return clean(`${dayMonth.format(first)} to ${sameMonth ? day.format(last) : dayMonth.format(last)}`);
}

/** "dom, 8 nov" or "Sun, Nov 8". */
export const shortDate = (date: string, lang: Lang = "es") => clean(fmt(lang, { weekday: "short", day: "numeric", month: "short" }).format(at(date)));

/** "Noviembre 2026" or "November 2026" for a YYYY-MM month. */
export function monthLabel(month: string, lang: Lang = "es") {
  const text = fmt(lang, { month: "long", year: "numeric" }).format(at(`${month}-15`)).replace(" de ", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The hour and minutes in Costa Rica of a moment, as 14:05. */
export const costaRicaTime = (moment: Date) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Costa_Rica" }).format(moment);
