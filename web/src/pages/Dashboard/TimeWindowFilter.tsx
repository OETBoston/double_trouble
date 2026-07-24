import type { WindowPreset } from "./timeWindow";
import styles from "./Dashboard.module.css";

const PRESETS: Array<{ value: WindowPreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "Past 7 days" },
  { value: "month", label: "Past 30 days" },
  { value: "custom", label: "Custom range" },
];

export function TimeWindowFilter({
  preset,
  onPresetChange,
  customStart,
  customEnd,
  onCustomChange,
  live,
  onLiveChange,
}: {
  preset: WindowPreset;
  onPresetChange: (preset: WindowPreset) => void;
  customStart: string;
  customEnd: string;
  onCustomChange: (start: string, end: string) => void;
  live: boolean;
  onLiveChange: (live: boolean) => void;
}) {
  return (
    <div className={styles.filterBar} role="group" aria-labelledby="time-filter-heading">
      <span id="time-filter-heading" className={styles.filterHeading}>
        Time window
      </span>
      <div className={styles.presetButtons}>
        {PRESETS.map((p) => (
          <button
            key={p.value}
            aria-pressed={preset === p.value}
            className={preset === p.value ? styles.presetActive : styles.preset}
            onClick={() => onPresetChange(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className={styles.customRange}>
          <label>
            From
            <input
              type="date"
              value={customStart}
              onChange={(e) => onCustomChange(e.target.value, customEnd)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={customEnd}
              onChange={(e) => onCustomChange(customStart, e.target.value)}
            />
          </label>
        </div>
      )}

      <label className={styles.liveToggle}>
        <input
          type="checkbox"
          checked={live}
          onChange={(e) => onLiveChange(e.target.checked)}
        />
        Live updates
        <span className={live ? styles.liveDotOn : styles.liveDotOff} aria-hidden="true" />
      </label>
    </div>
  );
}
