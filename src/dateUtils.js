// Returns today's date as YYYY-MM-DD in the user's local timezone.
// (new Date().toISOString().split("T")[0] returns UTC date, which can be off by
// a day for users east/west of UTC near midnight.)
export function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parses a YYYY-MM-DD (or YYYY-MM-DDTHH:MM...) string as local-midnight Date.
// new Date("2026-05-17") parses as UTC midnight, which lands on the previous day
// for negative-offset timezones. This helper keeps the calendar date intact.
export function parseLocalDate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
