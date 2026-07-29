export type WindowPreset = "today" | "week" | "month" | "custom";

export interface ResolvedWindow {
  start: string;
  end: string;
}

// new Date("YYYY-MM-DD") parses as UTC midnight; re-anchoring that to local
// midnight with setHours() then lands on the previous calendar day for any
// timezone behind UTC (including Boston's own Eastern time). Parsing the
// components directly builds the Date in local time from the start.
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function resolveWindow(
  preset: WindowPreset,
  customStart: string,
  customEnd: string
): ResolvedWindow {
  const now = new Date();

  if (preset === "custom" && customStart && customEnd) {
    const start = parseLocalDate(customStart);
    start.setHours(0, 0, 0, 0);
    const end = parseLocalDate(customEnd);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const start = new Date(now);
  if (preset === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (preset === "week") {
    start.setDate(start.getDate() - 7);
  } else {
    start.setDate(start.getDate() - 30);
  }

  return { start: start.toISOString(), end: now.toISOString() };
}
