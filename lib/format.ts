/** Display formatting. Uses the viewer's locale and time zone. */

const dateTime = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
const timeOnly = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

export function formatDateTime(ms: number): string {
  return dateTime.format(ms);
}

export function formatTime(ms: number): string {
  return timeOnly.format(ms);
}

export function formatDate(ms: number): string {
  return dateOnly.format(ms);
}

/** "45 min", "3 h 20 min", "2 d 4 h". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (totalHours < 24) return minutes ? `${totalHours} h ${minutes} min` : `${totalHours} h`;
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours ? `${days} d ${hours} h` : `${days} d`;
}

/** "in 3 h 20 min", "5 min ago", "just now". */
export function formatRelative(ms: number, now: number): string {
  const diff = ms - now;
  if (Math.abs(diff) < 60_000) return "just now";
  return diff > 0 ? `in ${formatDuration(diff)}` : `${formatDuration(-diff)} ago`;
}

export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  const km = metres / 1000;
  return `${km < 100 ? km.toFixed(1) : Math.round(km).toLocaleString()} km`;
}

/** Hours as a short decimal string for form inputs, e.g. 2.5. */
export function msToHoursInput(ms: number): string {
  return String(Math.round((ms / 3_600_000) * 100) / 100);
}
