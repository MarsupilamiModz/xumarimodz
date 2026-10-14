"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { ReportPriority, ReportStatus } from "@prisma/client";
import { assignReport, updateReportStatus } from "@/actions/admin/trust";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDate, formatNumber } from "@/lib/format-locale";

type Report = {
  id: string;
  targetType: string;
  targetId: string;
  category: string;
  description: string;
  status: ReportStatus;
  priority: ReportPriority;
  adminNotes: string | null;
  internalNotes: string | null;
  assignmentRole: string | null;
  attachments: unknown;
  createdAt: Date;
  reporter: { username: string; email: string };
  assignee: { username: string } | null;
};

const STATUSES: ReportStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_MORE_INFO",
  "INVESTIGATING",
  "RESOLVED",
  "REJECTED",
];

const PRIORITIES: ReportPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

const STATUS_TONE: Record<string, StatusTone> = {
  SUBMITTED: "pending",
  UNDER_REVIEW: "info",
  NEEDS_MORE_INFO: "warning",
  INVESTIGATING: "info",
  RESOLVED: "success",
  REJECTED: "neutral",
};

const PRIORITY_TONE: Record<string, StatusTone> = { LOW: "neutral", NORMAL: "neutral", HIGH: "warning", URGENT: "danger", CRITICAL: "danger" };

export function ReportsAdminPanel({ reports }: { reports: Report[] }) {
  const t = useTranslations("admin.panelReports");
  const tStatus = useTranslations("status.report");
  const tPriority = useTranslations("status.priority");
  const tRole = useTranslations("status.role");
  const tCat = useTranslations("report.cat");
  const tTarget = useTranslations("admin.panelReports.target");
  const tt = useTranslations("toast");
  const locale = useLocale();
  const appToast = useAppToast();
  const [rows, setRows] = useState(reports);
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [internal, setInternal] = useState<Record<string, string>>({});
  const [assigneeIds, setAssigneeIds] = useState<Record<string, string>>({});

  // Unbekannte Werte (neue Enum-Einträge) roh anzeigen statt des Schlüssels.
  const label = (tr: typeof tStatus, value: string) => (tr.has(value) ? tr(value) : value.replace(/_/g, " "));

  function updateStatus(id: string, status: ReportStatus, priority?: ReportPriority) {
    startTransition(async () => {
      const r = await updateReportStatus(
        id,
        status,
        undefined,
        notes[id],
        internal[id],
        priority
      );
      if (r.success) {
        setRows((prev) =>
          prev.map((row) =>
            row.id === id ? { ...row, status, priority: priority ?? row.priority } : row
          )
        );
        appToast.raw({ title: tt("reportUpdated") });
      } else appToast.error(r.error);
    });
  }

  function assign(id: string, role: "MODERATOR" | "ADMIN" | "OWNER") {
    const assigneeId = assigneeIds[id]?.trim();
    if (!assigneeId) {
      appToast.raw({ title: tt("staffIdRequired"), variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const r = await assignReport(id, assigneeId, role);
      if (r.success) {
        appToast.raw({ title: tt("reportAssigned") });
      } else appToast.error(r.error);
    });
  }

  if (rows.length === 0) {
    return <EmptyState icon={Flag} title={t("emptyTitle")} description={t("emptyText")} />;
  }

  return (
    <div className="space-y-4">
      {rows.map((report) => (
        <SectionCard
          key={report.id}
          title={label(tCat, report.category)}
          description={
            <>
              {t("byReporter", { username: report.reporter.username })} · {formatDate(report.createdAt, locale)}
              {report.assignee ? ` · ${t("assignedTo", { username: report.assignee.username })}` : ""}
            </>
          }
          action={
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge tone={STATUS_TONE[report.status] ?? "neutral"} label={label(tStatus, report.status)} />
              <StatusBadge tone={PRIORITY_TONE[report.priority] ?? "neutral"} label={label(tPriority, report.priority)} />
              <StatusBadge tone="neutral" label={label(tTarget, report.targetType)} />
              {report.assignmentRole && <StatusBadge tone="info" label={label(tRole, report.assignmentRole)} />}
            </div>
          }
        >
          <div className="space-y-4 text-sm">
            <p className="whitespace-pre-wrap text-ink">{report.description}</p>
            <p className="meta">
              {t("targetId")}: <span className="mono-id">{report.targetId}</span>
              {Array.isArray(report.attachments) && report.attachments.length > 0 && (
                <> · {t("attachments", { count: formatNumber(report.attachments.length, locale) })}</>
              )}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor={`report-notes-${report.id}`} className="label-text">{t("staffNotes")}</label>
                <Textarea
                  id={`report-notes-${report.id}`}
                  placeholder={t("staffNotesPlaceholder")}
                  value={notes[report.id] ?? report.adminNotes ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [report.id]: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`report-internal-${report.id}`} className="label-text">{t("internalNotes")}</label>
                <Textarea
                  id={`report-internal-${report.id}`}
                  placeholder={t("internalNotesPlaceholder")}
                  value={internal[report.id] ?? report.internalNotes ?? ""}
                  onChange={(e) => setInternal((n) => ({ ...n, [report.id]: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <label htmlFor={`report-status-${report.id}`} className="label-text">{t("statusLabel")}</label>
                <Select
                  value={report.status}
                  onValueChange={(v) => updateStatus(report.id, v as ReportStatus)}
                  disabled={pending}
                >
                  <SelectTrigger id={`report-status-${report.id}`} className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {label(tStatus, s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`report-priority-${report.id}`} className="label-text">{t("priorityLabel")}</label>
                <Select
                  value={report.priority}
                  onValueChange={(v) => updateStatus(report.id, report.status, v as ReportPriority)}
                  disabled={pending}
                >
                  <SelectTrigger id={`report-priority-${report.id}`} className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {label(tPriority, p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`report-assignee-${report.id}`} className="label-text">{t("staffUserId")}</label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id={`report-assignee-${report.id}`}
                  value={assigneeIds[report.id] ?? ""}
                  onChange={(e) => setAssigneeIds((a) => ({ ...a, [report.id]: e.target.value }))}
                  className="mono-id max-w-xs"
                />
                <Button size="sm" variant="outline" disabled={pending} onClick={() => assign(report.id, "MODERATOR")}>
                  {t("assignModerator")}
                </Button>
                <Button size="sm" variant="outline" disabled={pending} onClick={() => assign(report.id, "ADMIN")}>
                  {t("assignAdmin")}
                </Button>
                <Button size="sm" variant="outline" disabled={pending} onClick={() => assign(report.id, "OWNER")}>
                  {t("assignOwner")}
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
