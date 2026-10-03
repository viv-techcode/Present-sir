/** Present Sir — date/time helpers. All dates are stored as YYYY-MM-DD strings. */

export const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_LABELS_HI = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];

export function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function toISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function nowTime(): string {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map((part) => Number(part));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function isValidISO(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(fromISO(iso).getTime());
}

export function addDays(iso: string, days: number): string {
  const date = fromISO(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

export function diffDays(a: string, b: string): number {
  return Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86_400_000);
}

export function dayOfWeek(iso: string): number {
  return fromISO(iso).getDay();
}

export function startOfWeek(iso: string): string {
  const dow = dayOfWeek(iso);
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}

export function weekDates(iso: string): string[] {
  const start = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function monthLabel(iso: string, locale: string): string {
  const date = fromISO(iso);
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function monthMatrix(iso: string): string[][] {
  const date = fromISO(iso);
  const first = toISO(new Date(date.getFullYear(), date.getMonth(), 1));
  const gridStart = startOfWeek(first);
  const weeks: string[][] = [];
  let cursor = gridStart;
  for (let week = 0; week < 6; week += 1) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(cursor, index)));
    cursor = addDays(cursor, 7);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    if (fromISO(cursor) > lastDay) break;
  }
  return weeks;
}

export function formatDate(iso: string, locale: string): string {
  if (!isValidISO(iso)) return iso;
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(fromISO(iso));
}

export function formatDateShort(iso: string, locale: string): string {
  if (!isValidISO(iso)) return iso;
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
  }).format(fromISO(iso));
}

export function formatWeekday(iso: string, locale: string): string {
  if (!isValidISO(iso)) return "";
  const label = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    weekday: "short",
  }).format(fromISO(iso));
  return label;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((part) => Number(part));
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const total = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function formatTime(time: string, locale: string): string {
  if (!/^\d{2}:\d{2}$/.test(time)) return time;
  const [h, m] = time.split(":").map(Number);
  const date = new Date(2024, 0, 1, h, m);
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatTimeRange(start: string, end: string, locale: string): string {
  return `${formatTime(start, locale)} – ${formatTime(end, locale)}`;
}

/** 1-based ISO-ish week number used for odd/even week parity of lab batches. */
export function weekNumber(iso: string): number {
  const date = fromISO(iso);
  const target = new Date(date.getFullYear(), 0, 1);
  const firstWeekDay = target.getDay();
  const offset = firstWeekDay === 0 ? 6 : firstWeekDay - 1;
  return Math.ceil((Math.round((date.getTime() - target.getTime()) / 86_400_000) + offset) / 7) || 1;
}

export function weekParityMatches(slotParity: string, iso: string): boolean {
  if (!slotParity || slotParity === "all") return true;
  const parity = weekNumber(iso) % 2 === 0 ? "even" : "odd";
  return parity === slotParity;
}

export function isPastDateTime(iso: string, time: string, reference = new Date()): boolean {
  const [h, m] = time.split(":").map(Number);
  const stamp = fromISO(iso);
  stamp.setHours(h || 0, m || 0, 0, 0);
  return stamp.getTime() <= reference.getTime();
}

export function daysUntil(iso: string, from = todayISO()): number {
  return diffDays(iso, from);
}

export function toTimestamp(iso: string, time = "23:59"): number {
  const [h, m] = time.split(":").map(Number);
  const date = fromISO(iso);
  date.setHours(h || 0, m || 0, 0, 0);
  return date.getTime();
}

export function isoTimestampToDate(isoLike: string): string {
  return isoLike.slice(0, 10);
}
