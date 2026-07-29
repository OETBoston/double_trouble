import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchReports, fetchStats, submitReport } from "./client";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

describe("submitReport", () => {
  it("POSTs JSON to /api/reports and returns the parsed response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "abc" }));

    const result = await submitReport({
      latitude: 42.36,
      longitude: -71.06,
      locationMethod: "GPS",
      reportedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(result).toEqual({ id: "abc" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/reports$/);
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toMatchObject({ locationMethod: "GPS" });
  });

  it("throws when the API responds with an error status", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false));
    await expect(
      submitReport({
        latitude: 0,
        longitude: 0,
        locationMethod: "GPS",
        reportedAt: "2026-01-01T00:00:00.000Z",
      })
    ).rejects.toThrow("Failed to submit report");
  });
});

describe("fetchReports / fetchStats", () => {
  it("omits query params entirely when the window has no start/end", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ reports: [] }));
    await fetchReports({});
    expect(fetchMock.mock.calls[0][0]).not.toMatch(/\?/);
  });

  it("includes only the provided start/end as query params", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ totalReports: 0 }));
    await fetchStats({ start: "2026-01-01T00:00:00.000Z" });

    const url = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost");
    expect(url.searchParams.get("start")).toBe("2026-01-01T00:00:00.000Z");
    expect(url.searchParams.has("end")).toBe(false);
  });

  it("throws with the failing path in the message on error", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false));
    await expect(fetchReports({})).rejects.toThrow("/api/reports");
  });
});
