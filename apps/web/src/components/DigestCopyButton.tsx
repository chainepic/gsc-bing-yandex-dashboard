"use client";

import { useState } from "react";
import { useT } from "@/components/LocaleProvider";
import type { I18nKey } from "@/lib/i18n";

export function DigestCopyButton({
  markdown,
  labelKey = "digest_copy",
  copiedKey = "digest_copied",
}: {
  markdown: string;
  labelKey?: I18nKey;
  copiedKey?: I18nKey;
}) {
  const t = useT();
  const [ok, setOk] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setOk(true);
      window.setTimeout(() => setOk(false), 1600);
    } catch {
      // Fallback for older browsers / denied permission
      const ta = document.createElement("textarea");
      ta.value = markdown;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setOk(true);
        window.setTimeout(() => setOk(false), 1600);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="border border-line bg-mist px-2.5 py-1 text-xs hover:border-accent"
      title={t(labelKey)}
    >
      {ok ? t(copiedKey) : t(labelKey)}
    </button>
  );
}
