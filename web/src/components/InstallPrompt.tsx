import { useEffect, useState } from "react";
import { Button } from "./Button";
import styles from "./InstallPrompt.module.css";

const DISMISSED_KEY = "bos-parking-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's pre-standard standalone flag.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "1");

  useEffect(() => {
    if (isStandalone() || dismissed) return;

    if (isIos()) {
      // iOS Safari has no beforeinstallprompt API — the only way to install
      // is the manual Share -> Add to Home Screen flow, so just tell users
      // how, rather than waiting for an event that will never fire.
      setShowIosInstructions(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
    setDeferredEvent(null);
    setShowIosInstructions(false);
  };

  const install = async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    dismiss();
  };

  if (dismissed || (!deferredEvent && !showIosInstructions)) return null;

  return (
    <div className={styles.banner} role="status">
      {deferredEvent ? (
        <>
          <p className={styles.text}>Install this app for quicker, full-screen reporting.</p>
          <div className={styles.actions}>
            <Button variant="primary" onClick={install}>
              Install
            </Button>
            <Button variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.text}>
            Add this to your home screen: tap the Share icon in Safari's toolbar, then "Add to
            Home Screen".
          </p>
          <div className={styles.actions}>
            <Button variant="ghost" onClick={dismiss}>
              Got it
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
