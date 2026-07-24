import { useCallback, useEffect, useState } from "react";
import { fetchReports, fetchStats } from "../../api/client";
import type { ReportPoint, Stats } from "../../api/types";
import styles from "./Dashboard.module.css";
import { HeatMap } from "./HeatMap";
import { MetricsPanel } from "./MetricsPanel";
import { TimeWindowFilter } from "./TimeWindowFilter";
import { resolveWindow, WindowPreset } from "./timeWindow";

const LIVE_POLL_MS = 15000;

export function Dashboard() {
  const [preset, setPreset] = useState<WindowPreset>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [live, setLive] = useState(true);

  const [reports, setReports] = useState<ReportPoint[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const window = resolveWindow(preset, customStart, customEnd);
    try {
      const [reportsRes, statsRes] = await Promise.all([
        fetchReports(window),
        fetchStats(window),
      ]);
      setReports(reportsRes.reports);
      setStats(statsRes);
      setError(null);
    } catch {
      setError("Couldn't load dashboard data. Retrying shortly.");
    } finally {
      setLoading(false);
    }
  }, [preset, customStart, customEnd]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(load, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [live, load]);

  return (
    <div className={styles.page}>
      <h1>Boston Double-Parking Dashboard</h1>
      <p className={styles.subhead}>
        Live view of reported double-parking incidents, with time-window filtering and pattern
        metrics.
      </p>

      <TimeWindowFilter
        preset={preset}
        onPresetChange={setPreset}
        customStart={customStart}
        customEnd={customEnd}
        onCustomChange={(s, e) => {
          setCustomStart(s);
          setCustomEnd(e);
        }}
        live={live}
        onLiveChange={setLive}
      />

      {error && (
        <p role="alert" className={styles.errorText}>
          {error}
        </p>
      )}

      {loading && !stats ? (
        <p role="status">Loading dashboard…</p>
      ) : (
        <>
          <HeatMap reports={reports} live={live} />
          {stats && <MetricsPanel stats={stats} />}
        </>
      )}
    </div>
  );
}
