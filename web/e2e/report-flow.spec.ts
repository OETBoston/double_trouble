import { expect, test } from "@playwright/test";

// Every spec in this suite mocks the network entirely (our API + Mapbox) so
// these run without Docker/Postgres/the real backend, and without spending
// real Mapbox API quota. That trade-off means this suite proves the frontend
// is wired correctly, not that it integrates with a real backend/DB — the
// server's Vitest+Supertest suite covers that layer instead.
test.beforeEach(async ({ page }) => {
  // Map style/tile requests aren't needed for this flow and would otherwise
  // hit the real network; fail them fast instead of waiting on them.
  await page.route("**/api.mapbox.com/styles/**", (route) => route.abort());
  await page.route("**/*.tiles.mapbox.com/**", (route) => route.abort());
});

test("submits a report via address search and shows the success screen", async ({ page }) => {
  await page.route("**/api.mapbox.com/geocoding/**", (route) =>
    route.fulfill({
      json: {
        features: [
          {
            id: "abc",
            place_name: "1 City Hall Square, Boston, MA 02201, United States",
            center: [-71.0589, 42.3601],
          },
        ],
      },
    })
  );

  let submittedBody: unknown;
  await page.route("**/api/reports", (route) => {
    submittedBody = route.request().postDataJSON();
    route.fulfill({ status: 201, json: { id: "report-1", reportedAt: "2026-01-01T00:00:00.000Z" } });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Start a Report" }).click();
  await page.getByRole("button", { name: /search for an address/i }).click();

  await page.getByRole("combobox").fill("1 City Hall");
  await page.getByRole("option", { name: /1 City Hall Square/i }).click();

  await expect(page.getByRole("heading", { name: "Confirm your report" })).toBeVisible();
  await expect(page.getByText("1 City Hall Square, Boston, MA 02201, United States")).toBeVisible();

  await page.getByRole("button", { name: "Submit anonymously" }).click();

  await expect(page.getByRole("heading", { name: "Report received" })).toBeVisible();
  expect(submittedBody).toMatchObject({
    latitude: 42.3601,
    longitude: -71.0589,
    locationMethod: "ADDRESS_SEARCH",
  });

  await page.getByRole("button", { name: "Report another car" }).click();
  await expect(page.getByRole("heading", { name: "Report a Double-Parked Car" })).toBeVisible();
});

test("shows an error and stays on the confirm step if submission fails", async ({ page }) => {
  await page.route("**/api.mapbox.com/geocoding/**", (route) =>
    route.fulfill({
      json: {
        features: [
          { id: "abc", place_name: "100 Beacon St, Boston, MA", center: [-71.09, 42.35] },
        ],
      },
    })
  );
  await page.route("**/api/reports", (route) => route.fulfill({ status: 500, json: {} }));

  await page.goto("/");
  await page.getByRole("button", { name: "Start a Report" }).click();
  await page.getByRole("button", { name: /search for an address/i }).click();
  await page.getByRole("combobox").fill("100 Beacon");
  await page.getByRole("option", { name: /100 Beacon St/i }).click();
  await page.getByRole("button", { name: "Submit anonymously" }).click();

  await expect(page.getByRole("alert")).toContainText(/couldn't submit/i);
  await expect(page.getByRole("heading", { name: "Confirm your report" })).toBeVisible();
});
