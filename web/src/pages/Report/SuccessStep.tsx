import styles from "./ReportFlow.module.css";

export function SuccessStep({ onReportAnother }: { onReportAnother: () => void }) {
  return (
    <section aria-labelledby="success-heading" className={styles.stepSection}>
      <div className={styles.successIcon} aria-hidden="true">
        ✓
      </div>
      <h2 id="success-heading">Report received</h2>
      <p>Thank you. Your anonymous report has been logged and will help the city spot patterns.</p>
      <div className={styles.stepActions}>
        <button className={styles.primaryAction} onClick={onReportAnother}>
          Report another car
        </button>
      </div>
    </section>
  );
}
