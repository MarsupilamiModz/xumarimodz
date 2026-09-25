"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { GlobalSearchProvider, useGlobalSearch } from "@/components/search/global-search-provider";

// Suchdialog (Radix Dialog) erst beim ersten Öffnen laden – er gehört nicht ins Start-JS jeder Seite.
const GlobalSearchDialog = dynamic(() => import("@/components/search/global-search-dialog").then((m) => m.GlobalSearchDialog), {
  ssr: false,
});

function LazyDialog({ locale }: { locale: string }) {
  const { open } = useGlobalSearch();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  return mounted ? <GlobalSearchDialog locale={locale} /> : null;
}

export function GlobalSearchShell({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  return (
    <GlobalSearchProvider>
      {children}
      <LazyDialog locale={locale} />
    </GlobalSearchProvider>
  );
}
