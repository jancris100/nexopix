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
