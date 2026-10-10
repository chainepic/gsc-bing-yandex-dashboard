import cron from "node-cron";
import { getSettings } from "./settings";
import { runDigestJob } from "./digest-job";

let task: cron.ScheduledTask | null = null;
let started = false;

export function startCron() {
  if (started) return;
  started = true;
  scheduleFromSettings();
}

export function scheduleFromSettings() {
  const settings = getSettings();
  const expr = `${settings.digestMinute} ${settings.digestHour} * * *`;
  if (task) task.stop();
  if (!cron.validate(expr)) {
    console.warn("[search-triad] invalid cron expression", expr);
    return;
  }
  task = cron.schedule(
    expr,
    async () => {
      console.log("[search-triad] daily digest job starting");
      try {
        const result = await runDigestJob({ syncFirst: true, deliver: true });
        console.log("[search-triad] digest saved", result.id, result.deliveryNote);
      } catch (err) {
        console.error("[search-triad] digest job failed", err);
      }
    },
    { timezone: settings.timeZone }
  );
  console.log(`[search-triad] cron scheduled: ${expr} (${settings.timeZone})`);
}
