import Link from "next/link";
import { getFaqItems } from "@/lib/faq";
import { t } from "@/lib/i18n";
import { getRequestUiLocale } from "@/lib/locale-server";

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const locale = await getRequestUiLocale();
  const items = getFaqItems(locale);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2 border-b border-line pb-6">
        <h1 className="font-display text-2xl">{t(locale, "faq_title")}</h1>
        <p className="text-sm text-ink/70">{t(locale, "faq_sub")}</p>
        <p className="text-sm text-ink/55">
          <Link href="/guide" className="text-accent underline decoration-line underline-offset-2">
            {t(locale, "nav_guide")}
          </Link>
          {" · "}
          <Link href="/settings" className="text-accent underline decoration-line underline-offset-2">
            {t(locale, "nav_settings")}
          </Link>
        </p>
      </header>

      <ol className="space-y-6">
        {items.map((item, i) => (
          <li key={item.id} id={item.id} className="scroll-mt-6 border-b border-line/70 pb-6 last:border-0">
            <p className="font-mono text-xs text-ink/40">
              {i + 1}. {item.tags.join(" · ")}
            </p>
            <h2 className="mt-1 font-display text-lg">{item.q}</h2>
            <p className="mt-2 text-sm text-ink/70">
              <span className="text-ink/45">{t(locale, "faq_see")} </span>
              {item.see}
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-ink/80">
              {item.fix.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
