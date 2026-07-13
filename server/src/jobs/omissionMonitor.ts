import { detectCheckInOmissions } from "../services/alerts.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Runs one omission-detection pass, logging the outcome. Errors are caught and
 * logged so a failed pass never takes the process down.
 */
async function runPass(): Promise<void> {
  try {
    const created = await detectCheckInOmissions();
    if (created > 0) {
      console.log(
        `omission monitor: ${created} "Vínculo Domiciliar Fragilizado" alert(s) created`,
      );
    }
  } catch (error) {
    console.error("omission monitor: pass failed", error);
  }
}

/**
 * Starts the background monitoring process that watches for weekly-report
 * omissions: one pass at startup and then one per interval (daily by default).
 * The timer is unref'd so it never keeps the process alive on shutdown.
 * Returns the timer so callers (e.g. tests) can stop it.
 */
export function startOmissionMonitor(intervalMs = DAY_MS): NodeJS.Timeout {
  void runPass();
  const timer = setInterval(() => void runPass(), intervalMs);
  timer.unref();
  return timer;
}
