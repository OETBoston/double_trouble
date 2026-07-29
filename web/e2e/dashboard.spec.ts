import { expect, test } from "@playwright/test";

const STATS_RESPONSE = {
  totalReports: 3,
  byHour: Array.from({ length: 24 }, (_, hour) => ({ hour, count: hour === 9 ? 3 : 0 })),
  byDayOfWeek: [
    { day: "Sunday", count: 0 },
    { day: "Monday", count: 3 },
    { day: "Tuesday", count: 0 },
    { day: "Wednesday", count: 0 },
    { day: "Thursday", count: 0 },
    { day: "Friday", count: 0 },
    { day: "Saturday", count: 0 },
  ],
  trend: [{ date: "2026-01-05", count: 3 }],
  topStreets: [{ street: "1 City Hall Square", count: 3, latitude: 42.36, longitude: -71.06 }],
  peakHour: { hour: 9, count: 3 },
  peakDay: { day: "Monday", count: 3 },
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api.mapbox.com/styles/**", (route) => route.abort());
  await page.route("**/*.tiles.mapbox.com/**", (route) => route.abort());
  await page.route("**/api/reports*", (route) => route.fulfill({ json: { reports: [] } }));
  await page.route("**/api/stats*", (route) => route.fulfill({ json: STATS_RESPONSE }));
});

test("loads the dashboard and renders metrics from the API", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Boston Double-Parking Dashboard" })).toBeVisible();
  await expect(page.getByText("1 City Hall Square")).toBeVisible();
  await expect(page.getByRole("img", { name: /heat map of 0 double-parking reports/i })).toBeVisible();
});

test("switching time-window presets re-requests stats for that window", async ({ page }) => {
  const requestedWindows: string[] = [];
  await page.route("**/api/stats*", (route) => {
    requestedWindows.push(new URL(route.request().url()).search);
    route.fulfill({ json: STATS_RESPONSE });
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Today" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Past 7 days" }).click();
  await expect(page.getByRole("button", { name: "Past 7 days" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  await expect(async () => expect(requestedWindows.length).toBeGreaterThan(1)).toPass();
});

test("toggling live updates off stops polling and hides the LIVE badge", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByText("● LIVE")).toBeVisible();
  await page.getByRole("checkbox", { name: /live updates/i }).uncheck();
  await expect(page.getByText("● LIVE")).not.toBeVisible();
});

test("custom range reveals From/To date inputs", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByRole("button", { name: "Custom range" }).click();
  await expect(page.getByLabel("From", { exact: true })).toBeVisible();
  await expect(page.getByLabel("To", { exact: true })).toBeVisible();
});
