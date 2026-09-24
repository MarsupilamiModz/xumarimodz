"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type AcpNavGroup = {
  id: string;
  title: string;
  links: { href: string; label: string }[];
};

function isActive(pathname: string, base: string, href: string) {
  const full = `${base}${href}`;
  if (href === "") return pathname === base;
  return pathname === full || pathname.startsWith(`${full}/`);
}

function NavGroups({ groups, base, pathname }: { groups: AcpNavGroup[]; base: string; pathname: string }) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.id}>
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">{group.title}</p>
          <ul className="mt-2 space-y-0.5">
            {group.links.map((link) => {
              const active = isActive(pathname, base, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={`${base}${link.href}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center rounded-md px-3 text-sm transition-colors duration-fast",
                      active ? "bg-violet-soft font-semibold text-violet-bright" : "text-ink-muted hover:bg-hover hover:text-ink"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Feste ACP-Sidebar (232px) ab lg, darunter ein aufklappbares Menü. */
export function AcpNav({
  groups,
  base,
  title,
  subtitle,
  userName,
  menuLabel,
}: {
  groups: AcpNavGroup[];
  base: string;
  title: string;
  subtitle: string;
  userName: string;
  menuLabel: string;
}) {
  const pathname = usePathname() ?? "";

  return (
    <>
      <aside
        aria-label={subtitle}
        className="sticky top-header hidden h-[calc(100vh-var(--header-height))] w-acp-sidebar shrink-0 overflow-y-auto border-r border-line bg-sidebar px-3 py-6 lg:block"
      >
        <div className="px-3">
          <p className="text-base font-bold text-ink">
            {title} <span className="font-normal text-ink-muted">· {subtitle}</span>
          </p>
          <p className="meta mt-1 truncate">{userName}</p>
        </div>
        <nav className="mt-6" aria-label={subtitle}>
          <NavGroups groups={groups} base={base} pathname={pathname} />
        </nav>
      </aside>

      <details className="group border-b border-line bg-sidebar lg:hidden">
        <summary className="flex h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          {title} · {menuLabel}
          <ChevronDown className="h-4 w-4 text-ink-muted transition-transform duration-base group-open:rotate-180" aria-hidden />
        </summary>
        <nav className="px-2 pb-4" aria-label={subtitle}>
          <NavGroups groups={groups} base={base} pathname={pathname} />
        </nav>
      </details>
    </>
  );
}
