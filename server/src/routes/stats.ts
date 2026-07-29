import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const statsRouter = Router();

const statsQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

function streetFromAddress(address: string | null): string {
  if (!address) return "Unknown location";
  return address.split(",")[0]?.trim() || address;
}

// Boston-only app, so "peak hour"/"peak day" should always reflect Eastern
// time regardless of the server's own clock — cloud hosts (Render
// included) typically run containers in UTC, which is where the previous
// getHours()/getDay()/toISOString() based bucketing was silently drifting.
const REPORTING_TIMEZONE = "America/New_York";
const localTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: REPORTING_TIMEZONE,
  hourCycle: "h23",
  hour: "numeric",
  weekday: "long",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function localDateParts(date: Date): { hour: number; weekday: string; dateKey: string } {
  const parts = Object.fromEntries(
    localTimeFormatter.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    hour: Number(parts.hour),
    weekday: parts.weekday,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

statsRouter.get("/", async (req, res) => {
  const parsed = statsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_query", details: parsed.error.flatten() });
  }
  const { start, end } = parsed.data;

  const reports = await prisma.report.findMany({
    where: {
      reportedAt: {
        gte: start ? new Date(start) : undefined,
        lte: end ? new Date(end) : undefined,
      },
    },
    select: { latitude: true, longitude: true, address: true, reportedAt: true },
  });

  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const byDayOfWeek = DAY_NAMES.map((day) => ({ day, count: 0 }));
  const dayIndexByName = new Map(DAY_NAMES.map((day, i) => [day, i]));
  const byDate = new Map<string, number>();
  const byStreet = new Map<string, { count: number; latitude: number; longitude: number }>();

  for (const report of reports) {
    const { hour, weekday, dateKey } = localDateParts(report.reportedAt);
    byHour[hour].count += 1;
    byDayOfWeek[dayIndexByName.get(weekday)!].count += 1;
    byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + 1);

    const street = streetFromAddress(report.address);
    const existing = byStreet.get(street);
    if (existing) {
      existing.count += 1;
    } else {
      byStreet.set(street, { count: 1, latitude: report.latitude, longitude: report.longitude });
    }
  }

  const trend = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const topStreets = Array.from(byStreet.entries())
    .map(([street, v]) => ({ street, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const peakHour = byHour.reduce((max, cur) => (cur.count > max.count ? cur : max), byHour[0]);
  const peakDay = byDayOfWeek.reduce(
    (max, cur) => (cur.count > max.count ? cur : max),
    byDayOfWeek[0]
  );

  res.json({
    totalReports: reports.length,
    byHour,
    byDayOfWeek,
    trend,
    topStreets,
    peakHour: reports.length ? peakHour : null,
    peakDay: reports.length ? peakDay : null,
  });
});
