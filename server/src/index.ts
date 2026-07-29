import { existsSync, readFileSync } from "fs";
import { createServer as createHttpsServer } from "https";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import cors from "cors";
import express from "express";
import { reportsRouter } from "./routes/reports.js";
import { statsRouter } from "./routes/stats.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",");
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/reports", reportsRouter);
app.use("/api/stats", statsRouter);

// A frontend served over HTTPS (needed on phones for geolocation) can't
// fetch a plain-HTTP API — browsers block it as mixed content. Reuses the
// same mkcert cert as the Vite dev server when present; falls back to
// plain HTTP otherwise so this still runs without any extra setup.
const currentDir = dirname(fileURLToPath(import.meta.url));
const certPath = resolve(currentDir, "../../certs/lan-cert.pem");
const keyPath = resolve(currentDir, "../../certs/lan-key.pem");

if (existsSync(certPath) && existsSync(keyPath)) {
  createHttpsServer(
    { cert: readFileSync(certPath), key: readFileSync(keyPath) },
    app
  ).listen(port, () => {
    console.log(`Boston Parking Reporter API listening on https://:${port}`);
  });
} else {
  app.listen(port, () => {
    console.log(`Boston Parking Reporter API listening on :${port}`);
  });
}
