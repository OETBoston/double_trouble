import { useCallback, useEffect, useState } from "react";
import { submitReport } from "../../api/client";
import type { LocationMethod } from "../../api/types";
import { AddressSearchStep } from "./AddressSearchStep";
import { ConfirmStep } from "./ConfirmStep";
import { LocationMethodPicker } from "./LocationMethodPicker";
import { MapPinStep } from "./MapPinStep";
import styles from "./ReportFlow.module.css";
import { SuccessStep } from "./SuccessStep";

export interface LocationResult {
  latitude: number;
  longitude: number;
  address: string | null;
  method: LocationMethod;
}

type Step = "landing" | "method" | "gps" | "pin" | "search" | "confirm" | "success";

export function ReportFlow() {
  const [step, setStep] = useState<Step>("landing");
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleMethodChosen = useCallback((method: LocationMethod) => {
    if (method === "GPS") setStep("gps");
    if (method === "MAP_PIN") setStep("pin");
    if (method === "ADDRESS_SEARCH") setStep("search");
  }, []);

  const handleLocationResolved = useCallback((result: LocationResult) => {
    setLocation(result);
    setStep("confirm");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!location) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitReport({
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address ?? undefined,
        locationMethod: location.method,
        reportedAt: new Date().toISOString(),
      });
      // Brief confirmation buzz on devices that support it; a no-op
      // elsewhere (desktop browsers simply lack navigator.vibrate).
      navigator.vibrate?.(60);
      setStep("success");
    } catch {
      setSubmitError("We couldn't submit your report. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }, [location]);

  const startOver = useCallback(() => {
    setLocation(null);
    setSubmitError(null);
    setStep("landing");
  }, []);

  return (
    <div className={styles.page}>
      {step === "landing" && (
        <section className={styles.hero} aria-labelledby="report-heading">
          <h1 id="report-heading">Report a Double-Parked Vehicle</h1>
          <p className={styles.lead}>
            See a vehicle illegally double-parked in Boston? Report it in under a minute — no
            account, no personal information required.
          </p>
          <button className={styles.startButton} onClick={() => setStep("method")}>
            Start a Report
          </button>
          <p className={styles.anonymousNote}>
            Reports are submitted anonymously. We only record the location and time you provide.
          </p>
        </section>
      )}

      {step === "method" && <LocationMethodPicker onChoose={handleMethodChosen} />}

      {step === "gps" && (
        <GpsStep onResolved={handleLocationResolved} onBack={() => setStep("method")} />
      )}

      {step === "pin" && (
        <MapPinStep onResolved={handleLocationResolved} onBack={() => setStep("method")} />
      )}

      {step === "search" && (
        <AddressSearchStep onResolved={handleLocationResolved} onBack={() => setStep("method")} />
      )}

      {step === "confirm" && location && (
        <ConfirmStep
          location={location}
          submitting={submitting}
          error={submitError}
          onConfirm={handleSubmit}
          onBack={() => setStep("method")}
        />
      )}

      {step === "success" && <SuccessStep onReportAnother={startOver} />}
    </div>
  );
}

function GpsStep({
  onResolved,
  onBack,
}: {
  onResolved: (result: LocationResult) => void;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<"locating" | "error">("locating");
  const [message, setMessage] = useState("Finding your current location…");

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage("Your device doesn't support automatic location. Try dropping a pin instead.");
      return;
    }
    setStatus("locating");
    setMessage("Finding your current location…");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let address: string | null = null;
        try {
          const { reverseGeocode } = await import("../../lib/mapboxGeocoding");
          address = await reverseGeocode(longitude, latitude);
        } catch {
          address = null;
        }
        onResolved({ latitude, longitude, address, method: "GPS" });
      },
      () => {
        setStatus("error");
        setMessage(
          "We couldn't access your location. Check your browser's location permission, or try dropping a pin on the map instead."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onResolved]);

  // Kick off the location lookup as soon as this step mounts.
  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section aria-labelledby="gps-heading" className={styles.stepSection}>
      <h2 id="gps-heading">Using your current location</h2>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {status === "locating" && <div className={styles.spinner} aria-hidden="true" />}
      <div className={styles.stepActions}>
        {status === "error" && (
          <button className={styles.primaryAction} onClick={start}>
            Try again
          </button>
        )}
        <button className={styles.linkButton} onClick={onBack}>
          Choose a different method
        </button>
      </div>
    </section>
  );
}
