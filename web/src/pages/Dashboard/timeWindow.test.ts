import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveWindow } from "./timeWindow";

// 2026-01-15 is a Thursday; picked arbitrarily, matters only for readability.
const NOW = new Date("2026-01-15T14:30:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("resolveWindow", () => {
  it('"today" starts at local midnight and ends at the current instant', () => {
    const { start, end } = resolveWindow("today", "", "");
    const startDate = new Date(start);
    expect(startDate.getHours()).toBe(0);
    expect(startDate.getMinutes()).toBe(0);
    expect(startDate.getSeconds()).toBe(0);
    expect(end).toBe(NOW.toISOString());
  });

  it('"week" goes back exactly 7 days, preserving the time of day', () => {
    const { start, end } = resolveWindow("week", "", "");
    const startDate = new Date(start);
    expect(startDate.getTime()).toBe(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(end).toBe(NOW.toISOString());
  });

  it('"month" goes back exactly 30 days, preserving the time of day', () => {
    const { start, end } = resolveWindow("month", "", "");
    const startDate = new Date(start);
    expect(startDate.getTime()).toBe(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(end).toBe(NOW.toISOString());
  });

  it('"custom" spans local start-of-day to end-of-day across the given dates', () => {
    const { start, end } = resolveWindow("custom", "2026-01-01", "2026-01-03");
    const startDate = new Date(start);
    const endDate = new Date(end);
    expect(startDate.getDate()).toBe(1);
    expect(startDate.getHours()).toBe(0);
    expect(startDate.getMinutes()).toBe(0);
    expect(endDate.getDate()).toBe(3);
    expect(endDate.getHours()).toBe(23);
    expect(endDate.getMinutes()).toBe(59);
    expect(endDate.getSeconds()).toBe(59);
  });

  // Documents current (surprising) behavior: an incomplete custom range
  // silently falls back to the 30-day "month" window rather than erroring
  // or defaulting to today. If this ever changes, it should be deliberate.
  it('"custom" with a missing end date falls back to the 30-day window', () => {
    const { start, end } = resolveWindow("custom", "2026-01-01", "");
    const startDate = new Date(start);
    expect(startDate.getTime()).toBe(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(end).toBe(NOW.toISOString());
  });
});
