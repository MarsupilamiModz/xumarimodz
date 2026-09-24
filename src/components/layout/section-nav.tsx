"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionNavItem = { href: string; label: string; icon?: LucideIcon; exact?: boolean };

function isActive(pathname: string, item: SectionNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Bereichsnavigation (Konto, Studio): senkrecht ab lg, darunter waagerecht scrollbar.
 * `href` ist der vollständige Pfad inkl. Sprache.
 */
export function SectionNav({ items, label }: { items: SectionNavItem[]; label: string }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label={label}>
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm transition-colors duration-fast",
                  active ? "bg-violet-soft font-semibold text-violet-bright" : "text-ink-muted hover:bg-hover hover:text-ink"
                )}
              >
                {Icon && <Icon className="h-4 w-4" aria-hidden />}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
