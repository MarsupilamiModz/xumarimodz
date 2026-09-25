"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Bestätigung für destruktive Aktionen (Löschen, Sperren, Widerrufen, Erstatten). Esc schließt. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant = "default",
  loading,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  /** Zusätzliche Felder, z. B. ein Grund für eine Sperre. */
  children?: React.ReactNode;
}) {
  const t = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children && <div className="py-1">{children}</div>}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => void onConfirm()}
            disabled={loading}
            aria-busy={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {confirmLabel ?? t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
