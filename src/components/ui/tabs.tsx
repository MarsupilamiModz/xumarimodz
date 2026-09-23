"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (v: string) => void;
  baseId: string;
} | null>(null);

const tabId = (baseId: string, value: string) => `${baseId}-tab-${value}`;
const panelId = (baseId: string, value: string) => `${baseId}-panel-${value}`;

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const value = controlledValue ?? internal;
  const setValue = onValueChange ?? setInternal;
  const baseId = React.useId();

  return (
    <TabsContext.Provider value={{ value, onValueChange: setValue, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

/** Pfeiltasten, Pos1 und Ende wechseln zwischen den Tabs (WAI-ARIA Tabs-Muster). */
function handleTabListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
  const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!keys.includes(event.key)) return;
  const tabs = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')
  );
  const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
  if (current === -1) return;
  event.preventDefault();
  let next = current;
  if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
  if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = tabs.length - 1;
  tabs[next]?.focus();
  tabs[next]?.click();
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      role="tablist"
      onKeyDown={handleTabListKeyDown}
      className={cn(
        "flex items-center gap-6 overflow-x-auto border-b border-line text-ink-muted",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      id={tabId(ctx.baseId, value)}
      aria-selected={active}
      aria-controls={panelId(ctx.baseId, value)}
      tabIndex={active ? 0 : -1}
      className={cn(
        "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent py-3 text-sm font-semibold transition-colors duration-fast hover:text-ink",
        active && "border-violet-bright text-ink",
        className
      )}
      onClick={() => ctx.onValueChange(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={panelId(ctx.baseId, value)}
      aria-labelledby={tabId(ctx.baseId, value)}
      tabIndex={0}
      className={cn("mt-6", className)}
    >
      {children}
    </div>
  );
}
