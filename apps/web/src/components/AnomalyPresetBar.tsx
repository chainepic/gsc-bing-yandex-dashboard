"use client";

import { ANOMALY_PRESETS, type AnomalyPresetId } from "@search-triad/connectors/filters";
import { useT } from "@/components/LocaleProvider";
import type { I18nKey } from "@/lib/i18n";

const PRESET_KEYS: Record<AnomalyPresetId, { label: I18nKey; desc: I18nKey }> = {
  all: { label: "anomaly_all", desc: "anomaly_all_desc" },
  click_plunge: { label: "anomaly_click_plunge", desc: "anomaly_click_plunge_desc" },
  impressions_up_clicks_down: { label: "anomaly_ctr_risk", desc: "anomaly_ctr_risk_desc" },
  impression_plunge: { label: "anomaly_impr_plunge", desc: "anomaly_impr_plunge_desc" },
  gains: { label: "anomaly_gains", desc: "anomaly_gains_desc" },
};

export function AnomalyPresetBar({
  value,
  onChange,
}: {
  value: AnomalyPresetId;
  onChange: (id: AnomalyPresetId) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("anomaly_aria")}>
      {ANOMALY_PRESETS.map((preset) => {
        const selected = preset.id === value;
        const keys = PRESET_KEYS[preset.id];
        return (
          <button
            key={preset.id}
            type="button"
            title={keys ? t(keys.desc) : preset.description}
            onClick={() => onChange(preset.id)}
            className={`border px-2.5 py-1 text-xs ${
              selected ? "border-accent bg-accent text-paper" : "border-line bg-mist text-ink/80"
            }`}
          >
            {keys ? t(keys.label) : preset.label}
          </button>
        );
      })}
    </div>
  );
}
