export type WindowPreset = "today" | "week" | "month" | "custom";

export interface ResolvedWindow {
  start: string;
  end: string;
}

export function resolveWindow(
  preset: WindowPreset,
  customStart: string,
  customEnd: string
): ResolvedWindow {
  const now = new Date();

  if (preset === "custom" && customStart && customEnd) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
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
