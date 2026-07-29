import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../lib/prisma.js";
import { statsRouter } from "./stats.js";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    report: {
      findMany: vi.fn(),
    },
  },
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/stats", statsRouter);
  return app;
}

function report(overrides: Partial<{
  latitude: number;
  longitude: number;
  address: string | null;
  reportedAt: Date;
}>) {
  return {
    latitude: 42.36,
    longitude: -71.06,
    address: "1 City Hall Square, Boston, MA",
    reportedAt: new Date("2026-01-05T09:00:00.000Z"), // a Monday
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/stats", () => {
  it("returns zeroed-out buckets and null peaks with no reports", async () => {
    vi.mocked(prisma.report.findMany).mockResolvedValue([] as never);

    const res = await request(buildApp()).get("/api/stats");

    expect(res.status).toBe(200);
    expect(res.body.totalReports).toBe(0);
    expect(res.body.byHour).toHaveLength(24);
    expect(res.body.byHour.every((h: { count: number }) => h.count === 0)).toBe(true);
    expect(res.body.byDayOfWeek).toHaveLength(7);
    expect(res.body.trend).toEqual([]);
    expect(res.body.topStreets).toEqual([]);
    expect(res.body.peakHour).toBeNull();
    expect(res.body.peakDay).toBeNull();
  });

  it("buckets reports by hour and day of week in Eastern time, regardless of server TZ", async () => {
    vi.mocked(prisma.report.findMany).mockResolvedValue([
      report({ reportedAt: new Date("2026-01-05T09:15:00.000Z") }), // Mon 4:15am ET (Jan = EST, UTC-5)
      report({ reportedAt: new Date("2026-01-05T09:45:00.000Z") }), // Mon 4:45am ET
      report({ reportedAt: new Date("2026-01-06T17:00:00.000Z") }), // Tue 12:00pm ET
    ] as never);

    const res = await request(buildApp()).get("/api/stats");

    expect(res.body.totalReports).toBe(3);
    const hour4 = res.body.byHour.find((h: { hour: number }) => h.hour === 4);
    expect(hour4.count).toBe(2);
    expect(res.body.peakHour).toMatchObject({ hour: 4, count: 2 });

    const monday = res.body.byDayOfWeek.find((d: { day: string }) => d.day === "Monday");
    const tuesday = res.body.byDayOfWeek.find((d: { day: string }) => d.day === "Tuesday");
    expect(monday.count).toBe(2);
    expect(tuesday.count).toBe(1);
  });

  it("computes the day-count trend sorted ascending by date, in Eastern time", async () => {
    vi.mocked(prisma.report.findMany).mockResolvedValue([
      report({ reportedAt: new Date("2026-01-06T00:00:00.000Z") }), // Jan 5, 7pm ET
      report({ reportedAt: new Date("2026-01-05T00:00:00.000Z") }), // Jan 4, 7pm ET
      report({ reportedAt: new Date("2026-01-05T12:00:00.000Z") }), // Jan 5, 7am ET
    ] as never);

    const res = await request(buildApp()).get("/api/stats");

    expect(res.body.trend).toEqual([
      { date: "2026-01-04", count: 1 },
      { date: "2026-01-05", count: 2 },
    ]);
  });

  it("groups topStreets by the text before the first comma in the address", async () => {
    vi.mocked(prisma.report.findMany).mockResolvedValue([
      report({ address: "1 City Hall Square, Boston, MA" }),
      report({ address: "1 City Hall Square, Boston, MA 02201" }),
      report({ address: "100 Beacon St, Boston, MA" }),
    ] as never);

    const res = await request(buildApp()).get("/api/stats");

    expect(res.body.topStreets[0]).toMatchObject({ street: "1 City Hall Square", count: 2 });
    expect(res.body.topStreets[1]).toMatchObject({ street: "100 Beacon St", count: 1 });
  });

  it('falls back to "Unknown location" for reports with no address', async () => {
    vi.mocked(prisma.report.findMany).mockResolvedValue([
      report({ address: null }),
      report({ address: null }),
    ] as never);

    const res = await request(buildApp()).get("/api/stats");

    expect(res.body.topStreets).toEqual([
      expect.objectContaining({ street: "Unknown location", count: 2 }),
    ]);
  });

  it("caps topStreets at the top 10 by count", async () => {
    const reports = Array.from({ length: 12 }, (_, i) =>
      report({ address: `Street ${i}, Boston, MA` })
    );
    // Give street 11 an extra report so ordering isn't just insertion order.
    reports.push(report({ address: "Street 11, Boston, MA" }));
    vi.mocked(prisma.report.findMany).mockResolvedValue(reports as never);

    const res = await request(buildApp()).get("/api/stats");

    expect(res.body.topStreets).toHaveLength(10);
    expect(res.body.topStreets[0]).toMatchObject({ street: "Street 11", count: 2 });
  });

  it("rejects a non-ISO start/end value", async () => {
    const res = await request(buildApp()).get("/api/stats").query({ end: "not-a-date" });
    expect(res.status).toBe(400);
  });
});
