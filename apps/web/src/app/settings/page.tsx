import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/SettingsForm";
import { getSettings } from "@/server/settings";
import { secretsStatus } from "@/server/secrets";
import { latestSync, listSites, parseSyncDetail } from "@/server/queries";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  if (!getSettings().setupComplete) redirect("/setup");
  const settings = getSettings();
  const status = secretsStatus();
  const sites = listSites();
  const sync = latestSync();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-ink/65">Credentials, schedule, notifications, and site bindings.</p>
      </section>
      <SettingsForm
        initialSettings={settings}
        status={status}
        sites={sites}
        lastSync={
          sync
            ? {
                status: sync.status,
                message: sync.message,
                at: sync.finishedAt || sync.startedAt,
                detail: parseSyncDetail(sync.detailJson),
              }
            : null
        }
      />
    </div>
  );
}
