import type { CreateReportInput, ReportPoint, Stats, TimeWindow } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function windowQuery(window: TimeWindow): string {
  const params = new URLSearchParams();
  if (window.start) params.set("start", window.start);
  if (window.end) params.set("end", window.end);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function submitReport(input: CreateReportInput): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error("Failed to submit report");
  }
  return res.json();
}

export function fetchReports(window: TimeWindow): Promise<{ reports: ReportPoint[] }> {
  return request(`/api/reports${windowQuery(window)}`);
}

export function fetchStats(window: TimeWindow): Promise<Stats> {
  return request(`/api/stats${windowQuery(window)}`);
}
