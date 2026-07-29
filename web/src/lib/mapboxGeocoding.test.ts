import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forwardGeocode, reverseGeocode } from "./mapboxGeocoding";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("forwardGeocode", () => {
  it("returns an empty array without calling fetch for a blank query", async () => {
    const result = await forwardGeocode("   ");
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requests Mapbox's geocoding endpoint biased to the Boston bounding box", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ features: [] }));

    await forwardGeocode("1 City Hall Square");

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(decodeURIComponent(requestedUrl.pathname)).toContain("1 City Hall Square");
    expect(requestedUrl.searchParams.get("bbox")).toBe("-71.191,42.227,-70.986,42.400");
    expect(requestedUrl.searchParams.get("proximity")).toBe("-71.0589,42.3601");
    expect(requestedUrl.searchParams.get("limit")).toBe("5");
    expect(requestedUrl.searchParams.get("types")).toBe("address,poi");
  });

  it("maps Mapbox features to GeocodeSuggestion shape", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        features: [
          { id: "abc", place_name: "1 City Hall Square, Boston, MA", center: [-71.0589, 42.3601] },
        ],
      })
    );

    const result = await forwardGeocode("City Hall");

    expect(result).toEqual([
      {
        id: "abc",
        placeName: "1 City Hall Square, Boston, MA",
        longitude: -71.0589,
        latitude: 42.3601,
      },
    ]);
  });

  it("throws when the response is not ok", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false));
    await expect(forwardGeocode("anything")).rejects.toThrow("Geocoding request failed");
  });
});

describe("reverseGeocode", () => {
  it("returns the first feature's place name", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ features: [{ place_name: "100 Beacon St, Boston, MA" }] })
    );

    const result = await reverseGeocode(-71.0589, 42.3601);
    expect(result).toBe("100 Beacon St, Boston, MA");
  });

  it("returns null when there are no features", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ features: [] }));
    expect(await reverseGeocode(-71.0589, 42.3601)).toBeNull();
  });

  it("returns null (rather than throwing) when the response is not ok", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false));
    expect(await reverseGeocode(-71.0589, 42.3601)).toBeNull();
  });
});
