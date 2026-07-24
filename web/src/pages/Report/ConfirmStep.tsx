import type { LocationResult } from "./ReportFlow";
import styles from "./ReportFlow.module.css";

function staticMapUrl(lat: number, lng: number): string {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l-marker+FFB81C(${lng},${lat})/${lng},${lat},15,0/500x260@2x?access_token=${token}`;
}

export function ConfirmStep({
  location,
  submitting,
  error,
  onConfirm,
  onBack,
}: {
  location: LocationResult;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const timestamp = new Date();

  return (
    <section aria-labelledby="confirm-heading" className={styles.stepSection}>
      <h2 id="confirm-heading">Confirm your report</h2>

      <img
        src={staticMapUrl(location.latitude, location.longitude)}
        alt={`Map showing the reported location${location.address ? ` at ${location.address}` : ""}`}
        className={styles.previewImage}
        width={500}
        height={260}
      />

      <dl className={styles.confirmDetails}>
        <div>
          <dt>Location</dt>
          <dd>
            {location.address ??
              `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
          </dd>
        </div>
        <div>
          <dt>Time of report</dt>
          <dd>
            {timestamp.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </dd>
        </div>
      </dl>

      <p className={styles.anonymousNote}>
        This report will be submitted anonymously — no personal information is attached.
      </p>

      {error && (
        <p role="alert" className={styles.errorText}>
          {error}
        </p>
      )}

      <div className={styles.stepActions}>
        <button className={styles.primaryAction} onClick={onConfirm} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit anonymously"}
        </button>
        <button className={styles.linkButton} onClick={onBack} disabled={submitting}>
          Change location method
        </button>
      </div>
    </section>
  );
}
