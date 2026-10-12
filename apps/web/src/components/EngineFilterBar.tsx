"use client";

import { ENGINE_FILTERS, type EngineFilterId } from "@search-triad/connectors/filters";
import { useT } from "@/components/LocaleProvider";
import type { I18nKey } from "@/lib/i18n";

const FILTER_KEYS: Record<EngineFilterId, { label: I18nKey; desc: I18nKey }> = {
  all: { label: "engine_filter_all", desc: "engine_filter_all_desc" },
  gsc: { label: "engine_filter_gsc", desc: "engine_filter_gsc_desc" },
  bing: { label: "engine_filter_bing", desc: "engine_filter_bing_desc" },
  yandex: { label: "engine_filter_yandex", desc: "engine_filter_yandex_desc" },
};

export function EngineFilterBar({
  value,
  onChange,
}: {
  value: EngineFilterId;
  onChange: (id: EngineFilterId) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("engine_filter_aria")}>
      {ENGINE_FILTERS.map((filter) => {
        const selected = filter.id === value;
        const keys = FILTER_KEYS[filter.id];
        return (
          <button
            key={filter.id}
            type="button"
            title={t(keys.desc)}
            onClick={() => onChange(filter.id)}
            className={`border px-2.5 py-1 text-xs ${
              selected ? "border-accent bg-accent text-paper" : "border-line bg-mist text-ink/80"
            }`}
          >
            {t(keys.label)}
          </button>
        );
      })}
    </div>
  );
}
