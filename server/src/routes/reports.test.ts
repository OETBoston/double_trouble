import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const validBody = {
  latitude: 42.3601,
  longitude: -71.0589,
  locationMethod: "MAP_PIN" as const,
};

// The router's rate limiter keeps its request counts in a module-level,
// in-memory store, so reusing one router import across tests would let
// earlier tests silently eat into later tests' quota. Re-importing fresh
// modules per test (after resetModules) gives each test its own limiter
// and its own mock Prisma client.
let prisma: { report: { create: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> } };
let buildApp: () => express.Express;

beforeEach(async () => {
  vi.resetModules();
  prisma = { report: { create: vi.fn(), findMany: vi.fn() } };
  vi.doMock("../lib/prisma.js", () => ({ prisma }));

  const { reportsRouter } = await import("./reports.js");
  buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use("/api/reports", reportsRouter);
    return app;
  };
});

describe("POST /api/reports", () => {
  it("creates a report and returns 201 for a valid GPS submission", async () => {
    prisma.report.create.mockResolvedValue({
      id: "abc123",
      reportedAt: new Date("2026-01-01T12:00:00.000Z"),
    });

    const res = await request(buildApp())
      .post("/api/reports")
      .send({ ...validBody, locationMethod: "GPS" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "abc123", reportedAt: "2026-01-01T12:00:00.000Z" });
  });

  it.each(["GPS", "MAP_PIN", "ADDRESS_SEARCH"] as const)(
    "accepts locationMethod %s",
    async (locationMethod) => {
      prisma.report.create.mockResolvedValue({ id: "id", reportedAt: new Date() });

      const res = await request(buildApp())
        .post("/api/reports")
        .send({ ...validBody, locationMethod });

      expect(res.status).toBe(201);
    }
  );

  it("defaults reportedAt to the server clock when omitted", async () => {
    prisma.report.create.mockResolvedValue({ id: "id", reportedAt: new Date() });

    await request(buildApp()).post("/api/reports").send(validBody);

    const call = prisma.report.create.mock.calls[0][0];
    expect(call.data.reportedAt).toBeInstanceOf(Date);
  });

  it("uses the client-provided reportedAt when present", async () => {
    prisma.report.create.mockResolvedValue({ id: "id", reportedAt: new Date() });

    await request(buildApp())
      .post("/api/reports")
      .send({ ...validBody, reportedAt: "2025-06-15T08:30:00.000Z" });

    const call = prisma.report.create.mock.calls[0][0];
    expect(call.data.reportedAt.toISOString()).toBe("2025-06-15T08:30:00.000Z");
  });

  it("rejects a missing latitude/longitude with 400", async () => {
    const res = await request(buildApp())
      .post("/api/reports")
      .send({ locationMethod: "GPS" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_report");
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it.each([91, -91])("rejects an out-of-range latitude (%d)", async (latitude) => {
    const res = await request(buildApp())
      .post("/api/reports")
      .send({ ...validBody, latitude });

    expect(res.status).toBe(400);
  });

  it.each([181, -181])("rejects an out-of-range longitude (%d)", async (longitude) => {
    const res = await request(buildApp())
      .post("/api/reports")
      .send({ ...validBody, longitude });

    expect(res.status).toBe(400);
  });

  it("rejects an unrecognized locationMethod", async () => {
    const res = await request(buildApp())
      .post("/api/reports")
      .send({ ...validBody, locationMethod: "CARRIER_PIGEON" });

    expect(res.status).toBe(400);
  });

  it("rejects a malformed reportedAt string", async () => {
    const res = await request(buildApp())
      .post("/api/reports")
      .send({ ...validBody, reportedAt: "not-a-date" });

    expect(res.status).toBe(400);
  });

  it("never persists a user/device identifier, keeping submissions anonymous", async () => {
    prisma.report.create.mockResolvedValue({ id: "id", reportedAt: new Date() });

    await request(buildApp())
      .post("/api/reports")
      .send({ ...validBody, userId: "should-be-ignored", email: "nope@example.com" });

    const call = prisma.report.create.mock.calls[0][0];
    expect(call.data).not.toHaveProperty("userId");
    expect(call.data).not.toHaveProperty("email");
  });

  it("returns 429 after exceeding the per-minute rate limit", async () => {
    prisma.report.create.mockResolvedValue({ id: "id", reportedAt: new Date() });

    const app = buildApp();
    for (let i = 0; i < 10; i++) {
      const res = await request(app).post("/api/reports").send(validBody);
      expect(res.status).toBe(201);
    }

    const blocked = await request(app).post("/api/reports").send(validBody);
    expect(blocked.status).toBe(429);
  });
});

describe("GET /api/reports", () => {
  it("returns the report feed from the mocked data store", async () => {
    const points = [
      {
        id: "1",
        latitude: 42.36,
        longitude: -71.06,
        address: "1 City Hall Square",
        reportedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ];
    prisma.report.findMany.mockResolvedValue(points);

    const res = await request(buildApp()).get("/api/reports");

    expect(res.status).toBe(200);
    expect(res.body.reports).toHaveLength(1);
    expect(res.body.reports[0].address).toBe("1 City Hall Square");
  });

  it("passes start/end query params through as a date range filter", async () => {
    prisma.report.findMany.mockResolvedValue([]);

    await request(buildApp())
      .get("/api/reports")
      .query({ start: "2026-01-01T00:00:00.000Z", end: "2026-01-02T00:00:00.000Z" });

    const call = prisma.report.findMany.mock.calls[0][0];
    expect(call?.where?.reportedAt).toEqual({
      gte: new Date("2026-01-01T00:00:00.000Z"),
      lte: new Date("2026-01-02T00:00:00.000Z"),
    });
  });

  it("defaults the limit to 5000 and caps it at 10000", async () => {
    prisma.report.findMany.mockResolvedValue([]);

    await request(buildApp()).get("/api/reports");
    expect(prisma.report.findMany.mock.calls[0][0]?.take).toBe(5000);

    const overLimit = await request(buildApp()).get("/api/reports").query({ limit: 10001 });
    expect(overLimit.status).toBe(400);
  });

  it("rejects a non-ISO start/end value", async () => {
    const res = await request(buildApp()).get("/api/reports").query({ start: "yesterday" });
    expect(res.status).toBe(400);
  });
});
