import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SoundApprovalStatus, FileScanStatus } from "@prisma/client";

type Props = {
  approvalStatus: SoundApprovalStatus;
  previewScanStatus: FileScanStatus;
  approvedAt?: Date | null;
};

export function SoundApprovalPanel({ approvalStatus, previewScanStatus, approvedAt }: Props) {
  const isApproved =
    approvalStatus === "MANUALLY_APPROVED" || approvalStatus === "VIRUS_TOTAL_VERIFIED";
  const isRejected = approvalStatus === "REJECTED";
  const isPending = !isApproved && !isRejected;

  return (
    <Card className={`glass ${isApproved ? "border-success/20" : isRejected ? "border-destructive/30" : "border-warning/20"}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {isApproved ? (
            <ShieldCheck className="h-4 w-4 text-success" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-warning" />
          )}
          Sound security
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {isApproved && (
          <div className="space-y-1">
            <p className="font-medium text-success">✔ Approved</p>
            {approvalStatus === "MANUALLY_APPROVED" && (
              <p className="text-success/90">✔ Manually approved by moderation team</p>
            )}
            {approvalStatus === "VIRUS_TOTAL_VERIFIED" && (
              <p className="text-success/90">✔ VirusTotal verified</p>
            )}
            {(previewScanStatus === "CLEAN" || previewScanStatus === "APPROVED") && (
              <p className="text-success/90">✔ Scan passed</p>
            )}
          </div>
        )}
        {isPending && (
          <p className="text-warning">Awaiting moderation review — preview is available.</p>
        )}
        {isRejected && (
          <p className="text-destructive">This sound was rejected and is not available for playback.</p>
        )}
        {approvedAt && isApproved && (
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/30">
            Approved {approvedAt.toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
