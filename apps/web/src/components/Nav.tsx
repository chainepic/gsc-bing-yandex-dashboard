"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview" },
  { href: "/sites", label: "Sites" },
  { href: "/keywords", label: "Keywords" },
  { href: "/digest", label: "Digest" },
  { href: "/settings", label: "Settings" },
  { href: "/guide", label: "Guide" },
];

export function Nav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/setup")) return null;

  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        <p className="font-display text-2xl tracking-tight text-ink md:text-3xl">
          GSC · Bing · Yandex
        </p>
        <p className="mt-1 text-sm text-ink/65">Search Console + Webmaster — self-hosted dashboard</p>
      </div>
      <nav className="flex flex-wrap gap-1">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-sm transition ${
                active ? "bg-mist text-ink" : "text-ink/70 hover:bg-mist/70 hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
