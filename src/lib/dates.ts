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

const dayMonth = new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "short", timeZone: "UTC" });
const dayOnly = new Intl.DateTimeFormat("es-CR", { day: "numeric", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("es-CR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** "10 al 16 nov", or "29 dic al 4 ene" when the week crosses a month. */
export function weekRange(weekStart: string) {
  const first = new Date(`${weekStart}T12:00:00Z`);
  const last = new Date(`${addDays(weekStart, 6)}T12:00:00Z`);
  const sameMonth = first.getUTCMonth() === last.getUTCMonth();
  return `${sameMonth ? dayOnly.format(first) : dayMonth.format(first)} al ${dayMonth.format(last)}`.replace(/\./g, "");
}

export const shortDate = (date: string) => fullDate.format(new Date(`${date}T12:00:00Z`)).replace(/\./g, "");
