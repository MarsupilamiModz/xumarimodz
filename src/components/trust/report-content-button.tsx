"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import type { ReportTargetType } from "@prisma/client";
import { Button } from "@/components/ui/button";

// Dialog (Radix) erst beim ersten Öffnen laden – die Schaltfläche selbst ist sofort da.
const ReportContentDialog = dynamic(() => import("@/components/trust/report-content-dialog").then((m) => m.ReportContentDialog), { ssr: false });

export function ReportContentButton({ targetType, targetId, label }: { targetType: ReportTargetType; targetId: string; label?: string }) {
  const t = useTranslations("report");
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-haspopup="dialog"
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
      >
        <Flag className="h-4 w-4" aria-hidden />
        {label ?? t("title")}
      </Button>
      {loaded && <ReportContentDialog targetType={targetType} targetId={targetId} open={open} setOpen={setOpen} />}
    </>
  );
}
