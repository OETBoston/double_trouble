import "dotenv/config";
import cors from "cors";
import express from "express";
import { reportsRouter } from "./routes/reports.js";
import { statsRouter } from "./routes/stats.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/reports", reportsRouter);
app.use("/api/stats", statsRouter);

app.listen(port, () => {
  console.log(`Boston Parking Reporter API listening on :${port}`);
});
