"use client";

import type { ReactNode } from "react";
import { useNavUser } from "@/lib/nav-user-client";
import { adDensityClass, type AdExperienceLevel } from "@/lib/ad-experience-shared";
import { cn } from "@/lib/utils";

/**
 * Entscheidet im Browser, ob Werbung gezeigt wird – die Seite selbst rendert für Gäste und bleibt so
 * cachebar. Angemeldete bekommen ihre Stufe aus /api/auth/me (Premium: werbefrei). Bis dahin blendet
 * CSS die Fläche bei vorhandenem Session-Cookie aus (html.has-session, Skript im Root-Layout), damit
 * werbefreie Nutzer keine Werbung aufblitzen sehen.
 */
export function AdGate({
  guestLevel,
  hideWhenReduced = false,
  className,
  children,
}: {
  guestLevel: AdExperienceLevel;
  hideWhenReduced?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { status, user } = useNavUser();
  const level: AdExperienceLevel | null =
    status === "user" ? (user.adLevel ?? "full") : status === "guest" ? guestLevel : null;

  if (level === "none" || (hideWhenReduced && level === "reduced")) return null;

  return (
    <div
      data-ad-gate=""
      data-ad-ready={level ? "" : undefined}
      hidden={level === null && guestLevel === "none" ? true : undefined}
      className={cn(className, level ? adDensityClass(level) : undefined)}
    >
      {children}
    </div>
  );
}
