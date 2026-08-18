import { useCallback, useState } from "react";
import type { BlockedType, ReportDetails, VehicleType } from "../../api/types";
import { InvalidPhotoTypeError, PhotoTooLargeError, prepareImageForUpload } from "../../lib/imagePrep";
import type { LocationResult } from "./ReportFlow";
import styles from "./ReportFlow.module.css";

function staticMapUrl(lat: number, lng: number): string {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l-marker+1871BD(${lng},${lat})/${lng},${lat},15,0/500x260@2x?access_token=${token}`;
}

const BLOCKED_TYPE_OPTIONS: Array<{ value: BlockedType; label: string }> = [
  { value: "BIKE_LANE", label: "Bike lane" },
  { value: "BUS_LANE", label: "Bus lane" },
  { value: "FIRE_HYDRANT", label: "Fire hydrant" },
  { value: "CROSSWALK", label: "Crosswalk" },
  { value: "OTHER", label: "Other" },
];

const VEHICLE_TYPE_OPTIONS: Array<{ value: VehicleType; label: string }> = [
  { value: "COMMERCIAL_VEHICLE", label: "Commercial vehicle" },
  { value: "RIDESHARE_DELIVERY", label: "Rideshare / food delivery" },
  { value: "PERSONAL_VEHICLE", label: "Personal vehicle" },
  { value: "OTHER", label: "Other" },
];

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
  onConfirm: (details: ReportDetails) => void;
  onBack: () => void;
}) {
  const timestamp = new Date();

  const [blockedType, setBlockedType] = useState<BlockedType | null>(null);
  const [blockedTypeOther, setBlockedTypeOther] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [vehicleTypeOther, setVehicleTypeOther] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);

  const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so choosing the same file again still fires a change.
    e.target.value = "";
    if (!file) return;

    setPhotoError(null);
    setProcessingPhoto(true);
    try {
      const dataUrl = await prepareImageForUpload(file);
      setPhoto(dataUrl);
    } catch (err) {
      if (err instanceof InvalidPhotoTypeError) {
        setPhotoError("Please choose an image file.");
      } else if (err instanceof PhotoTooLargeError) {
        setPhotoError("That photo is too large (max 6MB). Try a smaller photo.");
      } else {
        setPhotoError("We couldn't process that photo. Try a different one.");
      }
    } finally {
      setProcessingPhoto(false);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm({
      blockedType: blockedType ?? undefined,
      blockedTypeOther:
        blockedType === "OTHER" && blockedTypeOther.trim() ? blockedTypeOther.trim() : undefined,
      vehicleType: vehicleType ?? undefined,
      vehicleTypeOther:
        vehicleType === "OTHER" && vehicleTypeOther.trim() ? vehicleTypeOther.trim() : undefined,
      photo: photo ?? undefined,
    });
  }, [blockedType, blockedTypeOther, vehicleType, vehicleTypeOther, photo, onConfirm]);

  return (
    <>
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

        <details className={styles.disclosure}>
          <summary className={styles.disclosureSummary}>
            What&apos;s being blocked? <span className={styles.optionalTag}>Optional</span>
          </summary>
          <fieldset className={styles.disclosureBody}>
            <legend className="visually-hidden">What&apos;s being blocked?</legend>
            <div className={styles.radioGroup}>
              {BLOCKED_TYPE_OPTIONS.map((opt) => (
                <label key={opt.value} className={styles.radioOption}>
                  <input
                    type="radio"
                    name="blockedType"
                    value={opt.value}
                    checked={blockedType === opt.value}
                    onChange={() => setBlockedType(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {blockedType === "OTHER" && (
              <input
                type="text"
                className={styles.textInput}
                placeholder="Describe what's blocked"
                aria-label="Describe what's blocked"
                value={blockedTypeOther}
                onChange={(e) => setBlockedTypeOther(e.target.value)}
                maxLength={120}
              />
            )}
          </fieldset>
        </details>

        <details className={styles.disclosure}>
          <summary className={styles.disclosureSummary}>
            Type of vehicle <span className={styles.optionalTag}>Optional</span>
          </summary>
          <fieldset className={styles.disclosureBody}>
            <legend className="visually-hidden">Type of vehicle</legend>
            <div className={styles.radioGroup}>
              {VEHICLE_TYPE_OPTIONS.map((opt) => (
                <label key={opt.value} className={styles.radioOption}>
                  <input
                    type="radio"
                    name="vehicleType"
                    value={opt.value}
                    checked={vehicleType === opt.value}
                    onChange={() => setVehicleType(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {vehicleType === "OTHER" && (
              <input
                type="text"
                className={styles.textInput}
                placeholder="Describe the vehicle"
                aria-label="Describe the vehicle"
                value={vehicleTypeOther}
                onChange={(e) => setVehicleTypeOther(e.target.value)}
                maxLength={120}
              />
            )}
          </fieldset>
        </details>

        <div className={styles.photoSection}>
          <span className={styles.fieldLabel}>
            Add a photo <span className={styles.optionalTag}>Optional</span>
          </span>
          {photo ? (
            <div className={styles.photoPreviewWrap}>
              <img
                src={photo}
                alt="Preview of the photo you added"
                className={styles.photoPreview}
              />
              <button type="button" className={styles.linkButton} onClick={() => setPhoto(null)}>
                Remove photo
              </button>
            </div>
          ) : (
            <>
              <div className={styles.photoOptions}>
                {/* capture="environment" hints mobile browsers to open the
                    rear camera directly; desktop browsers just ignore it and
                    fall back to a normal file picker. A separate input below
                    (without capture) covers picking an existing photo, since
                    some mobile browsers treat "capture" as camera-only and
                    drop the gallery option entirely. */}
                <label className={styles.photoOptionButton} htmlFor="report-photo-camera">
                  <span aria-hidden="true">📷</span> Take a photo
                </label>
                <input
                  id="report-photo-camera"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="visually-hidden"
                  onChange={handlePhotoChange}
                  disabled={processingPhoto}
                />
                <label className={styles.photoOptionButton} htmlFor="report-photo-file">
                  <span aria-hidden="true">🖼️</span> Choose a file
                </label>
                <input
                  id="report-photo-file"
                  type="file"
                  accept="image/*"
                  className="visually-hidden"
                  onChange={handlePhotoChange}
                  disabled={processingPhoto}
                />
              </div>
              {processingPhoto && (
                <p role="status" aria-live="polite">
                  Preparing photo…
                </p>
              )}
            </>
          )}
          {photoError && (
            <p role="alert" className={styles.errorText}>
              {photoError}
            </p>
          )}
        </div>

        <p className={styles.anonymousNote}>
          This report will be submitted anonymously — no personal information is attached.
        </p>

        {error && (
          <p role="alert" className={styles.errorText}>
            {error}
          </p>
        )}
      </section>
      {/* Outside the card on purpose -- see MapPinStep.tsx for why. */}
      <div className={styles.floatingActionsSpacer} aria-hidden="true" />
      <div className={styles.floatingActions}>
        <button className={styles.primaryAction} onClick={handleConfirm} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit anonymously"}
        </button>
        <button className={styles.linkButton} onClick={onBack} disabled={submitting}>
          Change location method
        </button>
      </div>
    </>
  );
}
