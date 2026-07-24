import type { LocationMethod } from "../../api/types";
import styles from "./ReportFlow.module.css";

const OPTIONS: Array<{
  method: LocationMethod;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    method: "GPS",
    label: "Use my current location",
    description: "Fastest option — uses your device's GPS.",
    icon: "📍",
  },
  {
    method: "MAP_PIN",
    label: "Drop a pin on the map",
    description: "Tap or use arrow keys to place a pin on the exact spot.",
    icon: "🗺️",
  },
  {
    method: "ADDRESS_SEARCH",
    label: "Search for an address",
    description: "Type a street address instead of using the map.",
    icon: "🔎",
  },
];

export function LocationMethodPicker({
  onChoose,
}: {
  onChoose: (method: LocationMethod) => void;
}) {
  return (
    <section aria-labelledby="method-heading" className={styles.stepSection}>
      <h2 id="method-heading">How do you want to set the location?</h2>
      <div className={styles.methodGrid} role="group" aria-labelledby="method-heading">
        {OPTIONS.map((opt) => (
          <button
            key={opt.method}
            className={styles.methodCard}
            onClick={() => onChoose(opt.method)}
          >
            <span className={styles.methodIcon} aria-hidden="true">
              {opt.icon}
            </span>
            <span className={styles.methodLabel}>{opt.label}</span>
            <span className={styles.methodDescription}>{opt.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
