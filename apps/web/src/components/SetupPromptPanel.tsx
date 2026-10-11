"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  SETUP_DEFAULT_ORIGIN,
  SETUP_REPO,
  googleRedirectUri,
  yandexRedirectUri,
} from "@/lib/setup-links";
import { useT } from "@/components/LocaleProvider";
import {
  buildSetupPrompt,
  buildSetupShellOneLiner,
  type SetupPromptLocale,
} from "@/lib/setup-prompt";

type CopyKind = "zh" | "en" | "shell";

export function SetupPromptPanel() {
  const t = useT();
  const [origin, setOrigin] = useState(SETUP_DEFAULT_ORIGIN);
  const [locale, setLocale] = useState<SetupPromptLocale>("zh");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState<CopyKind | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const promptZh = useMemo(() => buildSetupPrompt("zh", origin), [origin]);
  const promptEn = useMemo(() => buildSetupPrompt("en", origin), [origin]);
  const prompt = locale === "zh" ? promptZh : promptEn;
  const shell = useMemo(() => buildSetupShellOneLiner(), []);

  async function copy(text: string, kind: CopyKind) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied((c) => (c === kind ? null : c)), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3 border-b border-line pb-8">
        <p className="font-display text-4xl tracking-tight">GSC · Bing · Yandex</p>
        <h1 className="font-display text-2xl">{t("prompt_title")}</h1>
<p className="max-w-xl text-sm text-ink/70">{t("prompt_sub")}</p>
        <p className="text-sm text-ink/60">
          Repo:{" "}
          <a
            href={SETUP_REPO.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline decoration-line underline-offset-2"
          >
            {SETUP_REPO.githubUrl.replace("https://", "")}
          </a>
        </p>
      </header>

      <section className="panel space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copy(promptZh, "zh")}
            className="bg-accent px-4 py-2 text-sm text-paper"
          >
            {copied === "zh" ? t("prompt_copied_zh") : t("prompt_copy_zh")}
          </button>
          <button
            type="button"
            onClick={() => copy(promptEn, "en")}
            className="border border-line px-4 py-2 text-sm"
          >
            {copied === "en" ? t("prompt_copied_en") : t("prompt_copy_en")}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-sm text-ink/70">{t("prompt_preview_lang")}</p>
          <div className="flex gap-1 text-sm" role="tablist" aria-label="Preview language">
            <TabButton active={locale === "zh"} onClick={() => setLocale("zh")}>
              中文
            </TabButton>
            <TabButton active={locale === "en"} onClick={() => setLocale("en")}>
              English
            </TabButton>
          </div>
        </div>

        <p className="text-xs text-ink/55 leading-relaxed">
          {t("prompt_origin_note", { origin })}
          <br />
          <code className="break-all font-mono text-[11px] text-ink/80">{googleRedirectUri(origin)}</code>
          <br />
          <code className="break-all font-mono text-[11px] text-ink/80">{yandexRedirectUri(origin)}</code>
        </p>

        <details
          className="border-t border-line pt-3 text-sm"
          open={previewOpen}
          onToggle={(e) => setPreviewOpen(e.currentTarget.open)}
        >
          <summary className="cursor-pointer text-accent underline decoration-line underline-offset-2">
            {t("prompt_preview")}
          </summary>
          <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap break-words border border-line bg-mist/40 p-3 font-mono text-[11px] leading-relaxed text-ink/80">
            {prompt}
          </pre>
        </details>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-xl">{t("prompt_shell_title")}</h2>
<p className="text-sm text-ink/70">{t("prompt_shell_body")}</p>
        <pre className="overflow-x-auto whitespace-pre-wrap break-all border border-line bg-mist/40 p-3 font-mono text-[11px] text-ink/80">
          {shell}
        </pre>
        <button
          type="button"
          onClick={() => copy(shell, "shell")}
          className="border border-line px-3 py-1.5 text-sm"
        >
          {copied === "shell" ? t("prompt_copied_shell") : t("prompt_copy_shell")}
        </button>
      </section>

      <section className="space-y-2 text-sm text-ink/70">
        <h2 className="font-display text-xl text-ink">{t("prompt_covers")}</h2>
        <ul className="list-disc space-y-1 pl-5 leading-relaxed">
          <li>{t("prompt_cover_1")}</li>
          <li>{t("prompt_cover_2")}</li>
          <li>{t("prompt_cover_3")}</li>
          <li>{t("prompt_cover_4")}</li>
          <li>{t("prompt_cover_5")}</li>
          <li>{t("prompt_cover_6")}</li>
        </ul>
      </section>

      <footer className="border-t border-line pt-6 text-sm text-ink/60">
        {t("prompt_footer_pref")}{" "}
        <Link href="/setup" className="text-accent underline decoration-line underline-offset-2">
          {t("prompt_footer_setup")}
        </Link>
        {" · "}
        <Link href="/guide" className="text-accent underline decoration-line underline-offset-2">
          {t("common_guide")}
        </Link>
      </footer>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-3 py-1.5 transition ${
        active ? "bg-accent text-paper" : "border border-line text-ink/70 hover:bg-mist/70"
      }`}
    >
      {children}
    </button>
  );
}
