"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function StudioNav({
  locale,
  base,
  items,
}: {
  locale: string;
  base: string;
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 mb-8 overflow-x-auto border-b border-line px-4 lg:mx-0 lg:px-0">
      <ul className="flex gap-1">
      {items.map((item) => {
        const href = `/${locale}${base}${item.href}`;
        const active = pathname === href || (item.href !== "" && pathname?.startsWith(`${href}/`));
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center whitespace-nowrap px-3 text-sm transition-colors duration-fast",
                "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full",
                active ? "font-semibold text-ink after:bg-violet-bright" : "text-ink-muted hover:text-ink"
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
      </ul>
    </nav>
  );
}
