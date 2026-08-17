export type Period = "day" | "week" | "month";

export interface DateRange {
  start: Date;
  end: Date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getPeriodRange(period: Period, anchor = new Date()): DateRange {
  if (period === "day") {
    const start = startOfDay(anchor);
    return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1) };
  }
  if (period === "week") {
    const start = startOfDay(anchor);
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7) };
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  return { start, end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1) };
}

export function previousRange(period: Period, current: DateRange): DateRange {
  if (period === "month") {
    const start = new Date(current.start.getFullYear(), current.start.getMonth() - 1, 1);
    return { start, end: new Date(current.start) };
  }
  const length = current.end.getTime() - current.start.getTime();
  return { start: new Date(current.start.getTime() - length), end: new Date(current.start) };
}

export function isInRange(iso: string | null, range: DateRange): boolean {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return time >= range.start.getTime() && time < range.end.getTime();
}

export interface Bucket extends DateRange {
  label: string;
  shortLabel: string;
}

export function getActivityBuckets(period: Period, now = new Date()): Bucket[] {
  const count = period === "day" ? 30 : 12;
  const buckets: Bucket[] = [];
  const current = getPeriodRange(period, now);

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    let start: Date;
    let end: Date;
    if (period === "month") {
      start = new Date(current.start.getFullYear(), current.start.getMonth() - offset, 1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    } else {
      const length = period === "day" ? 86_400_000 : 7 * 86_400_000;
      start = new Date(current.start.getTime() - offset * length);
      end = new Date(start.getTime() + length);
    }
    const label = period === "day"
      ? start.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
      : period === "week"
        ? `Week of ${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
        : start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const shortLabel = period === "month"
      ? start.toLocaleDateString(undefined, { month: "short" })
      : start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    buckets.push({ start, end, label, shortLabel });
  }
  return buckets;
}

export function periodNoun(period: Period, previous = false): string {
  if (period === "day") return previous ? "yesterday" : "today";
  return previous ? `last ${period}` : `this ${period}`;
}
