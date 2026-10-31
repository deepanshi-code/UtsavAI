const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const formatINR = (n: number) => inr.format(n);

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** YYYY-MM-DD shifted by n days (UTC, so no DST drift). */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "Wed, 27 Jan 2027" for one day, "27–29 Jan 2027" for a multi-day run. */
export function formatDateRange(start: string, days = 1): string {
  if (days <= 1) return formatDate(start);
  const end = addDays(start, days - 1);
  const opts = { timeZone: "UTC" } as const;
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  const sameMonth = s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear();
  const left = s.toLocaleDateString(
    "en-IN",
    sameMonth ? { ...opts, day: "numeric" } : { ...opts, day: "numeric", month: "short" },
  );
  return `${left}–${e.toLocaleDateString("en-IN", { ...opts, day: "numeric", month: "short", year: "numeric" })}`;
}

export function daysUntil(date: string, today = new Date()): number {
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.parse(date) - t) / 86_400_000);
}

export function todayIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}
