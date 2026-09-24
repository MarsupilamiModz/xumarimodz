"use client";

import { Shield, ShieldCheck, ShieldAlert, ShieldX, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getSecurityBadgeKey,
  getSecurityBadgeVariant,
  isSecurityVerified,
  type SecurityBadgeKey,
} from "@/lib/security/status";
import type { FileScanStatus } from "@prisma/client";

type Props = {
  scanStatus: FileScanStatus;
  isTrusted?: boolean;
  compact?: boolean;
  className?: string;
};

const ICONS = {
  success: ShieldCheck,
  warning: ShieldAlert,
  danger: ShieldX,
  neutral: Shield,
  info: Loader2,
} as const;

export function SecurityBadge({ scanStatus, isTrusted = false, compact = false, className }: Props) {
  const t = useTranslations("security");
  const key = getSecurityBadgeKey(scanStatus, isTrusted);
  const variant = getSecurityBadgeVariant(scanStatus);
  const Icon = ICONS[variant];

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-normal",
        variant === "success" && "border-success/40 text-success bg-success/10",
        variant === "warning" && "border-warning/40 text-warning bg-warning/10",
        variant === "danger" && "border-danger/40 text-danger bg-danger/10",
        variant === "info" && "border-line-control text-ink-muted bg-hover",
        className
      )}
    >
      <Icon className={cn("h-3 w-3", variant === "info" && "animate-spin")} />
      {!compact && t(`badges.${key}` as `badges.${SecurityBadgeKey}`)}
    </Badge>
  );
}

export function SecurityVerifiedIcon({
  scanStatus,
  isTrusted = false,
  className,
}: {
  scanStatus: FileScanStatus;
  isTrusted?: boolean;
  className?: string;
}) {
  if (!isSecurityVerified(scanStatus, isTrusted)) return null;
  return <ShieldCheck className={cn("h-3.5 w-3.5 text-success", className)} />;
}
