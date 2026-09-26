import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { safeToLocaleDateString } from "@/lib/i18n/safe-locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PartnerApplication } from "@prisma/client";

type StatusEvent = {
  status: string;
  at: string;
  note?: string;
};

const STATUS_KEYS: Record<string, string> = {
  PENDING: "statusPending",
  UNDER_REVIEW: "statusUnderReview",
  NEEDS_CHANGES: "statusNeedsChanges",
  APPROVED: "statusApproved",
  REJECTED: "statusRejected",
};

function statusLabel(status: string, t: (key: string) => string) {
  const key = STATUS_KEYS[status];
  return key ? t(key) : status.replace(/_/g, " ");
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "APPROVED") return "default";
  if (status === "REJECTED") return "destructive";
  if (status === "NEEDS_CHANGES") return "secondary";
  return "outline";
}

export async function PartnerApplicationStatus({
  application,
}: {
  application: PartnerApplication;
}) {
  const t = await getTranslations("common.cx.partnerApplication");
  const history = (application.statusHistory as StatusEvent[] | null) ?? [];

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(application.status)}>{statusLabel(application.status, t)}</Badge>
          <span className="text-sm text-muted-foreground">
            {t("submitted", { date: safeToLocaleDateString(new Date(application.createdAt)) })}
          </span>
        </div>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {application.requiredChanges && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
            <p className="font-medium text-warning">{t("requiredChanges")}</p>
            <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{application.requiredChanges}</p>
          </div>
        )}

        {application.adminNotes && (
          <div className="rounded-lg border border-border/40 p-3">
            <p className="font-medium">{t("reviewNotes")}</p>
            <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{application.adminNotes}</p>
          </div>
        )}

        {application.reviewedAt && (
          <p className="text-muted-foreground">
            {t("lastReviewed", { date: new Date(application.reviewedAt).toLocaleString() })}
          </p>
        )}

        {history.length > 0 && (
          <div>
            <p className="font-medium mb-2">{t("statusHistoryTitle")}</p>
            <ul className="space-y-2">
              {[...history].reverse().map((event, i) => (
                <li key={`${event.at}-${i}`} className="border-l-2 border-violet-bright/40 pl-3">
                  <span className="font-medium">{statusLabel(event.status, t)}</span>
                  <span className="text-muted-foreground"> · {new Date(event.at).toLocaleString()}</span>
                  {event.note && <p className="text-muted-foreground mt-0.5">{event.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
