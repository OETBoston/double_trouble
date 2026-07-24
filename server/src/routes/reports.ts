import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const reportsRouter = Router();

// Anonymous submissions are easy to spam; cap per-IP report creation only
// (the GET feed below is polled continuously by the live dashboard).
const createReportLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const createReportSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().trim().min(1).max(300).optional(),
  locationMethod: z.enum(["GPS", "MAP_PIN", "ADDRESS_SEARCH"]),
  // Device-local timestamp captured at the moment of the report. Falls back
  // to the server clock if omitted or unparsable.
  reportedAt: z.string().datetime().optional(),
});

// Reports carry no user/device identifier by design — anonymous by default.
reportsRouter.post("/", createReportLimiter, async (req, res) => {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_report", details: parsed.error.flatten() });
  }

  const { latitude, longitude, address, locationMethod, reportedAt } = parsed.data;

  const report = await prisma.report.create({
    data: {
      latitude,
      longitude,
      address,
      locationMethod,
      reportedAt: reportedAt ? new Date(reportedAt) : new Date(),
    },
    select: { id: true, reportedAt: true },
  });

  res.status(201).json(report);
});

const listQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional(),
});

// Lightweight point feed for the heat map / live view.
reportsRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_query", details: parsed.error.flatten() });
  }
  const { start, end, limit } = parsed.data;

  const reports = await prisma.report.findMany({
    where: {
      reportedAt: {
        gte: start ? new Date(start) : undefined,
        lte: end ? new Date(end) : undefined,
      },
    },
    orderBy: { reportedAt: "desc" },
    take: limit ?? 5000,
    select: {
      id: true,
      latitude: true,
      longitude: true,
      address: true,
      reportedAt: true,
    },
  });

  res.json({ reports });
});
