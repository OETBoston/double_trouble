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
  const byDayOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ].map((day) => ({ day, count: 0 }));
  const byDate = new Map<string, number>();
  const byStreet = new Map<string, { count: number; latitude: number; longitude: number }>();

  for (const report of reports) {
    const d = report.reportedAt;
    byHour[d.getHours()].count += 1;
    byDayOfWeek[d.getDay()].count += 1;

    const dateKey = d.toISOString().slice(0, 10);
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
