const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Rough Boston bounding box, used to bias/limit geocoding results so the
// address search bar doesn't surface streets in, say, Ohio.
const BOSTON_BBOX = "-71.191,42.227,-70.986,42.400";
const BOSTON_PROXIMITY = "-71.0589,42.3601";

export interface GeocodeSuggestion {
  id: string;
  placeName: string;
  longitude: number;
  latitude: number;
}

export async function forwardGeocode(query: string): Promise<GeocodeSuggestion[]> {
  if (!query.trim()) return [];
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
  );
  url.searchParams.set("access_token", MAPBOX_TOKEN);
  url.searchParams.set("bbox", BOSTON_BBOX);
  url.searchParams.set("proximity", BOSTON_PROXIMITY);
  url.searchParams.set("limit", "5");
  url.searchParams.set("types", "address,poi");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Geocoding request failed");
  const data = await res.json();

  return (data.features ?? []).map((f: any) => ({
    id: f.id,
    placeName: f.place_name as string,
    longitude: f.center[0] as number,
    latitude: f.center[1] as number,
  }));
}

export async function reverseGeocode(longitude: number, latitude: number): Promise<string | null> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`
  );
  url.searchParams.set("access_token", MAPBOX_TOKEN);
  url.searchParams.set("types", "address");

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  return data.features?.[0]?.place_name ?? null;
}
