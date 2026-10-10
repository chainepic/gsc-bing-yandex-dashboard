export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCron } = await import("./server/cron");
    const { getDb } = await import("./server/db/client");
    getDb();
    startCron();
  }
}
