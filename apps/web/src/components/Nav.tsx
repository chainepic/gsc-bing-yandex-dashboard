"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/components/LocaleProvider";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import type { I18nKey } from "@/lib/i18n";

type NavLink = { href: string; key: I18nKey };

/** Daily work — stay visible. */
const primaryLinks: NavLink[] = [
  { href: "/", key: "nav_overview" },
  { href: "/sites", key: "nav_sites" },
  { href: "/keywords", key: "nav_keywords" },
  { href: "/recommendations", key: "nav_recommendations" },
  { href: "/digest", key: "nav_digest" },
  { href: "/settings", key: "nav_settings" },
];

/** Help / tools — fold into More. */
const moreLinks: NavLink[] = [
  { href: "/inspect", key: "nav_inspect" },
  { href: "/guide", key: "nav_guide" },
  { href: "/faq", key: "nav_faq" },
  { href: "/prompt", key: "nav_prompt" },
];

function linkActive(pathname: string | null, href: string) {
  return href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));
}

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-sm transition ${
        active ? "bg-mist text-ink" : "text-ink/70 hover:bg-mist/70 hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  const t = useT();
  const isSetup = pathname?.startsWith("/setup");
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const moreActive = moreLinks.some((l) => linkActive(pathname, l.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function onDoc(e: MouseEvent) {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  if (isSetup) {
    return (
      <header className="flex items-center justify-end border-b border-line pb-3">
        <LocaleSwitcher variant="compact" />
      </header>
    );
  }

  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        <p className="font-display text-2xl tracking-tight text-ink md:text-3xl">
          GSC · Bing · Yandex
        </p>
        <p className="mt-1 text-sm text-ink/65">{t("brand_sub")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex flex-wrap items-center gap-1" aria-label="Main">
          {primaryLinks.map((link) => (
            <NavItem
              key={link.href}
              href={link.href}
              label={t(link.key)}
              active={linkActive(pathname, link.href)}
            />
          ))}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls={menuId}
              aria-haspopup="menu"
              onClick={() => setMoreOpen((o) => !o)}
              className={`px-3 py-1.5 text-sm transition ${
                moreOpen || moreActive
                  ? "bg-mist text-ink"
                  : "text-ink/70 hover:bg-mist/70 hover:text-ink"
              }`}
            >
              {t("nav_more")}
              <span className="ml-1 inline-block text-[0.65rem] opacity-60" aria-hidden>
                {moreOpen ? "▴" : "▾"}
              </span>
            </button>
            {moreOpen && (
              <div
                id={menuId}
                role="menu"
                className="absolute right-0 z-20 mt-1 min-w-[10.5rem] border border-line bg-paper py-1 shadow-sm"
              >
                {moreLinks.map((link) => {
                  const active = linkActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      role="menuitem"
                      className={`block px-3 py-2 text-sm transition ${
                        active ? "bg-mist text-ink" : "text-ink/75 hover:bg-mist/70 hover:text-ink"
                      }`}
                    >
                      {t(link.key)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
        <LocaleSwitcher variant="compact" />
      </div>
    </header>
  );
}
