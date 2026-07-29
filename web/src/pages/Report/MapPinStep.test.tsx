import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reverseGeocode } from "../../lib/mapboxGeocoding";
import { MapPinStep } from "./MapPinStep";

vi.mock("../../lib/mapboxGeocoding", () => ({
  reverseGeocode: vi.fn(),
}));

// mapbox-gl needs a real WebGL canvas, which jsdom doesn't provide. This
// stub captures just enough behavior (click/keyboard -> center/pan, marker
// placement) for MapPinStep's own logic to be exercised without a real map.
// vi.mock's factory is hoisted above the rest of the file, so anything it
// references (the fake classes, shared state) has to be built via
// vi.hoisted rather than as ordinary top-level declarations.
const { mapState, FakeMap, FakeMarker } = vi.hoisted(() => {
  const mapState = { center: { lng: -71.0589, lat: 42.3601 } };

  class FakeMap {
    on() {}
    panBy([dx, dy]: [number, number]) {
      mapState.center = {
        lng: mapState.center.lng + dx * 0.001,
        lat: mapState.center.lat - dy * 0.001,
      };
    }
    getCenter() {
      return mapState.center;
    }
    remove() {}
  }

  class FakeMarker {
    private lngLat: { lng: number; lat: number } = { lng: 0, lat: 0 };
    setLngLat(lngLat: { lng: number; lat: number }) {
      this.lngLat = lngLat;
      return this;
    }
    getLngLat() {
      return this.lngLat;
    }
    addTo() {
      return this;
    }
    on() {
      return this;
    }
  }

  return { mapState, FakeMap, FakeMarker };
});

vi.mock("mapbox-gl", () => ({
  default: {
    accessToken: "",
    Map: FakeMap,
    Marker: FakeMarker,
  },
}));
vi.mock("mapbox-gl/dist/mapbox-gl.css", () => ({}));

beforeEach(() => {
  vi.mocked(reverseGeocode).mockReset();
  mapState.center = { lng: -71.0589, lat: 42.3601 };
});

describe("MapPinStep", () => {
  it('disables "Use this location" until a pin is placed', () => {
    render(<MapPinStep onResolved={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole("button", { name: /use this location/i })).toBeDisabled();
    expect(screen.getByText(/no pin placed yet/i)).toBeInTheDocument();
  });

  it("drops a pin at the map center on Enter and reports its coordinates", async () => {
    const user = userEvent.setup();
    render(<MapPinStep onResolved={vi.fn()} onBack={vi.fn()} />);

    const map = screen.getByRole("application");
    map.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByText(/pin placed at 42\.36010, -71\.05890/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /use this location/i })).toBeEnabled();
  });

  it("pans the map center with arrow keys before dropping a pin", async () => {
    const user = userEvent.setup();
    render(<MapPinStep onResolved={vi.fn()} onBack={vi.fn()} />);

    const map = screen.getByRole("application");
    map.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}{Enter}");

    // Two ArrowRight presses shift the center; the exact figure just needs
    // to differ from the untouched Boston center to prove panBy ran.
    expect(screen.getByText(/pin placed at/i)).toHaveTextContent(
      `${mapState.center.lat.toFixed(5)}, ${mapState.center.lng.toFixed(5)}`
    );
    expect(mapState.center.lng).not.toBe(-71.0589);
  });

  it("resolves the location with a reverse-geocoded address on confirm", async () => {
    vi.mocked(reverseGeocode).mockResolvedValue("1 City Hall Square, Boston, MA");
    const onResolved = vi.fn();
    const user = userEvent.setup();
    render(<MapPinStep onResolved={onResolved} onBack={vi.fn()} />);

    const map = screen.getByRole("application");
    map.focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: /use this location/i }));

    expect(onResolved).toHaveBeenCalledWith({
      latitude: 42.3601,
      longitude: -71.0589,
      address: "1 City Hall Square, Boston, MA",
      method: "MAP_PIN",
    });
  });

  it("still resolves the location (with a null address) if reverse geocoding fails", async () => {
    vi.mocked(reverseGeocode).mockRejectedValue(new Error("network down"));
    const onResolved = vi.fn();
    const user = userEvent.setup();
    render(<MapPinStep onResolved={onResolved} onBack={vi.fn()} />);

    const map = screen.getByRole("application");
    map.focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: /use this location/i }));

    expect(onResolved).toHaveBeenCalledWith(
      expect.objectContaining({ address: null, method: "MAP_PIN" })
    );
  });

  it('calls onBack when "Choose a different method" is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<MapPinStep onResolved={vi.fn()} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: /choose a different method/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
