import { Suspense } from "react";
import { SetupWizard } from "@/components/SetupWizard";
import { getSettings } from "@/server/settings";
import { secretsStatus } from "@/server/secrets";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  return (
    <Suspense fallback={<p className="py-8 text-sm text-ink/60">Loading setup…</p>}>
      <SetupWizard initialSettings={getSettings()} status={secretsStatus()} />
    </Suspense>
  );
}
