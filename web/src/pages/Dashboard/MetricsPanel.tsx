import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Stats } from "../../api/types";
import { Card } from "../../components/Card";
import styles from "./Dashboard.module.css";

function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}${period}`;
}

export function MetricsPanel({ stats }: { stats: Stats }) {
  const hourData = stats.byHour.map((h) => ({ ...h, label: formatHour(h.hour) }));

  return (
    <div className={styles.metricsGrid}>
      <Card>
        <h3>Total reports</h3>
        <p className={styles.bigNumber}>{stats.totalReports}</p>
        <p className={styles.metricCaption}>in the selected window</p>
      </Card>

      <Card>
        <h3>Peak reporting hour</h3>
        <p className={styles.bigNumber}>
          {stats.peakHour ? formatHour(stats.peakHour.hour) : "—"}
        </p>
        <p className={styles.metricCaption}>
          {stats.peakHour ? `${stats.peakHour.count} reports` : "No data yet"}
        </p>
      </Card>

      <Card>
        <h3>Peak day of week</h3>
        <p className={styles.bigNumber}>{stats.peakDay ? stats.peakDay.day : "—"}</p>
        <p className={styles.metricCaption}>
          {stats.peakDay ? `${stats.peakDay.count} reports` : "No data yet"}
        </p>
      </Card>

      <Card className={styles.wideCard}>
        <h3>Reports by hour of day</h3>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={hourData} aria-label="Bar chart of reports by hour of day">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#0c2340" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <table className="visually-hidden">
          <caption>Reports by hour of day</caption>
          <thead>
            <tr>
              <th scope="col">Hour</th>
              <th scope="col">Reports</th>
            </tr>
          </thead>
          <tbody>
            {hourData.map((h) => (
              <tr key={h.hour}>
                <td>{h.label}</td>
                <td>{h.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className={styles.wideCard}>
        <h3>Report volume trend</h3>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={stats.trend} aria-label="Line chart of report volume over time">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#c8102e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <table className="visually-hidden">
          <caption>Report volume by date</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Reports</th>
            </tr>
          </thead>
          <tbody>
            {stats.trend.map((t) => (
              <tr key={t.date}>
                <td>{t.date}</td>
                <td>{t.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className={styles.wideCard}>
        <h3>Top hotspot streets</h3>
        {stats.topStreets.length === 0 ? (
          <p>No reports yet in this window.</p>
        ) : (
          <ol className={styles.streetList}>
            {stats.topStreets.map((s) => (
              <li key={s.street}>
                <span className={styles.streetName}>{s.street}</span>
                <span className={styles.streetCount}>{s.count} reports</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
