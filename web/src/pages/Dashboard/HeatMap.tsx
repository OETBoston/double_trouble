import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import type { ReportPoint } from "../../api/types";
import styles from "./Dashboard.module.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const BOSTON_CENTER: [number, number] = [-71.0589, 42.3601];
const SOURCE_ID = "reports";

function toGeoJson(reports: ReportPoint[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: reports.map((r) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [r.longitude, r.latitude] },
      properties: { id: r.id, address: r.address, reportedAt: r.reportedAt },
    })),
  };
}

export function HeatMap({ reports, live }: { reports: ReportPoint[]; live: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: BOSTON_CENTER,
      zoom: 12,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource(SOURCE_ID, { type: "geojson", data: toGeoJson(reports) });

      map.addLayer({
        id: "reports-heat",
        type: "heatmap",
        source: SOURCE_ID,
        maxzoom: 17,
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1, 17, 3],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(12,35,64,0)",
            0.2,
            "#163862",
            0.4,
            "#1a73e8",
            0.6,
            "#ffb81c",
            0.8,
            "#ff7a1c",
            1,
            "#c8102e",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 14, 17, 32],
        },
      });

      map.addLayer({
        id: "reports-point",
        type: "circle",
        source: SOURCE_ID,
        minzoom: 15,
        paint: {
          "circle-radius": 5,
          "circle-color": "#ffb81c",
          "circle-stroke-color": "#0c2340",
          "circle-stroke-width": 1,
        },
      });

      loadedRef.current = true;
    });

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(toGeoJson(reports));
  }, [reports]);

  return (
    <div className={styles.heatMapWrapper}>
      <div
        ref={containerRef}
        className={styles.heatMap}
        role="img"
        aria-label={`Heat map of ${reports.length} double-parking reports in the selected time window${
          live ? ", updating live" : ""
        }. A text breakdown of the same data is available below in the metrics panel.`}
      />
      {live && (
        <span className={styles.liveBadge} aria-hidden="true">
          ● LIVE
        </span>
      )}
    </div>
  );
}
