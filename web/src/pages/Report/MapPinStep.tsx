import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { reverseGeocode } from "../../lib/mapboxGeocoding";
import type { LocationResult } from "./ReportFlow";
import styles from "./ReportFlow.module.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const BOSTON_CENTER: [number, number] = [-71.0589, 42.3601];
const PAN_STEP_PX = 60;

export function MapPinStep({
  onResolved,
  onBack,
}: {
  onResolved: (result: LocationResult) => void;
  onBack: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [selected, setSelected] = useState<mapboxgl.LngLat | null>(null);
  const [resolving, setResolving] = useState(false);

  const placeMarker = useCallback((lngLat: mapboxgl.LngLat) => {
    if (!mapRef.current) return;
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ draggable: true, color: "#1871bd" })
        .setLngLat(lngLat)
        .addTo(mapRef.current);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLngLat();
        setSelected(pos);
      });
    } else {
      markerRef.current.setLngLat(lngLat);
    }
    setSelected(lngLat);
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: BOSTON_CENTER,
      zoom: 13,
    });
    mapRef.current = map;

    map.on("click", (e) => placeMarker(e.lngLat));

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [placeMarker]);

  const handleMapKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const map = mapRef.current;
      if (!map) return;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          map.panBy([0, -PAN_STEP_PX]);
          break;
        case "ArrowDown":
          e.preventDefault();
          map.panBy([0, PAN_STEP_PX]);
          break;
        case "ArrowLeft":
          e.preventDefault();
          map.panBy([-PAN_STEP_PX, 0]);
          break;
        case "ArrowRight":
          e.preventDefault();
          map.panBy([PAN_STEP_PX, 0]);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          placeMarker(map.getCenter());
          break;
      }
    },
    [placeMarker]
  );

  const confirmLocation = useCallback(async () => {
    if (!selected) return;
    setResolving(true);
    let address: string | null = null;
    try {
      address = await reverseGeocode(selected.lng, selected.lat);
    } catch {
      address = null;
    }
    onResolved({ latitude: selected.lat, longitude: selected.lng, address, method: "MAP_PIN" });
  }, [selected, onResolved]);

  return (
    <>
      <section aria-labelledby="pin-heading" className={styles.stepSection}>
        <h2 id="pin-heading">Drop a pin at the location</h2>
        <p id="pin-instructions">
          Tap or click the map to place a pin. Keyboard users: focus the map, use the arrow keys
          to move it, then press Enter to drop a pin at the center crosshair. You can drag an
          existing pin to fine-tune it.
        </p>
        <div className={styles.mapWrapper}>
          <div
            ref={containerRef}
            className={styles.map}
            tabIndex={0}
            role="application"
            aria-label="Map of Boston. Use arrow keys to move, Enter to drop a pin at the crosshair."
            aria-describedby="pin-instructions"
            onKeyDown={handleMapKeyDown}
          />
          <div className={styles.crosshair} aria-hidden="true" />
        </div>
        {/* Screen readers still need to know a pin landed — sighted users get
            that from the marker appearing on the map itself, so this stays
            visually hidden rather than shown as on-screen text. Deliberately
            doesn't read out raw coordinates, which aren't meaningful to
            someone listening rather than looking at a map. */}
        <p role="status" aria-live="polite" className="visually-hidden">
          {selected ? "Pin placed." : ""}
        </p>
      </section>
      {/* Outside the card on purpose: floatingActions is fixed-position, so
          it doesn't need to be nested inside .stepSection to render
          correctly, and keeping the spacer out here too means any reserved
          space shows up as plain page background instead of dead space
          inside the white card. */}
      <div className={styles.floatingActionsSpacer} aria-hidden="true" />
      <div className={styles.floatingActions}>
        <button className={styles.primaryAction} disabled={!selected || resolving} onClick={confirmLocation}>
          {resolving ? "Looking up address…" : "Use this location"}
        </button>
        <button className={styles.linkButton} onClick={onBack}>
          Choose a different method
        </button>
      </div>
    </>
  );
}
