"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { ModDependencyRelation } from "@prisma/client";
import { useAppToast } from "@/hooks/use-app-toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addModDependency,
  removeModDependency,
  searchModsForDependency,
} from "@/actions/mod-dependencies";

type Dep = {
  id: string;
  dependencyId: string;
  isRequired: boolean;
  relation: ModDependencyRelation;
  dependency: { id: string; title: string; slug: string };
};

const RELATION_KEYS: Record<ModDependencyRelation, string> = {
  REQUIRED: "relationRequired",
  OPTIONAL: "relationOptional",
  CONFLICT: "relationIncompatible",
};

const RELATION_TONE: Record<ModDependencyRelation, StatusTone> = {
  REQUIRED: "info",
  OPTIONAL: "neutral",
  CONFLICT: "danger",
};

const labelClass = "label-text mb-1.5 block text-ink-muted";

function relationLabel(relation: ModDependencyRelation, isRequired: boolean, t: (key: string) => string) {
  const key = RELATION_KEYS[relation];
  return key ? t(key) : t(isRequired ? "relationRequired" : "relationOptional");
}

export function CreatorModDependenciesEditor({
  modId,
  gameId,
  initial,
}: {
  modId: string;
  gameId: string;
  initial: Dep[];
}) {
  const t = useTranslations("common.cx.modDependencies");
  const tp = useTranslations("creatorPages.modEditor");
  const tt = useTranslations("toast");
  const appToast = useAppToast();
  const [deps, setDeps] = useState(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [relation, setRelation] = useState<ModDependencyRelation>("REQUIRED");
  const [minVersion, setMinVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [removeTarget, setRemoveTarget] = useState<Dep | null>(null);
  const [pending, startTransition] = useTransition();

  function search() {
    startTransition(async () => {
      const r = await searchModsForDependency(query, gameId);
      if (r.success) setResults(r.data.filter((m) => m.id !== modId));
    });
  }

  function add(dependencyId: string) {
    startTransition(async () => {
      const r = await addModDependency(
        modId,
        dependencyId,
        relation === "REQUIRED",
        minVersion.trim() || undefined,
        notes.trim() || undefined,
        relation
      );
      if (r.success) {
        appToast.raw({ title: tt("dependencyAdded") });
        window.location.reload();
      } else appToast.error(r.error);
    });
  }

  function remove(dependencyId: string) {
    startTransition(async () => {
      const r = await removeModDependency(modId, dependencyId);
      if (r.success) {
        setDeps((d) => d.filter((x) => x.dependencyId !== dependencyId));
        setRemoveTarget(null);
        appToast.raw({ title: tt("removed") });
      }
    });
  }

  return (
    <SectionCard title={t("title")}>
      <div className="space-y-4">
        {deps.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("noDependencies")}</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {deps.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 px-4 py-2 text-[13px] text-ink">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate">{d.dependency.title}</span>
                  <StatusBadge tone={RELATION_TONE[d.relation] ?? "neutral"} label={relationLabel(d.relation, d.isRequired, t)} />
                </span>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => setRemoveTarget(d)}>
                  {t("remove")}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 border-t border-line pt-4">
          <h3 className="section-title">{t("addDependencyLabel")}</h3>
          <div>
            <label htmlFor="dependency-search" className={labelClass}>{tp("dependencySearch")}</label>
            <div className="flex gap-2">
              <Input
                id="dependency-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
              <Button variant="outline" disabled={pending} onClick={search}>
                {t("search")}
              </Button>
            </div>
          </div>
          <div>
            <label htmlFor="dependency-relation" className={labelClass}>{tp("dependencyRelation")}</label>
            <Select value={relation} onValueChange={(v) => setRelation(v as ModDependencyRelation)}>
              <SelectTrigger id="dependency-relation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REQUIRED">{t("selectRequired")}</SelectItem>
                <SelectItem value="OPTIONAL">{t("selectOptional")}</SelectItem>
                <SelectItem value="CONFLICT">{t("selectIncompatible")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {relation !== "CONFLICT" && (
            <div>
              <label htmlFor="dependency-min-version" className={labelClass}>{tp("dependencyMinVersion")}</label>
              <Input
                id="dependency-min-version"
                value={minVersion}
                onChange={(e) => setMinVersion(e.target.value)}
                placeholder={t("minVersionPlaceholder")}
              />
            </div>
          )}
          <div>
            <label htmlFor="dependency-notes" className={labelClass}>{tp("dependencyNotes")}</label>
            <Input
              id="dependency-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
            />
          </div>
          {results.length > 0 && (
            <div>
              <p className={labelClass} id="dependency-results-label">{tp("dependencyResults")}</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto" aria-labelledby="dependency-results-label">
                {results.map((m) => (
                  <li key={m.id}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      disabled={pending}
                      aria-label={tp("dependencyAddMod", { title: m.title })}
                      onClick={() => add(m.id)}
                    >
                      {m.title}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title={tp("dependencyRemoveTitle")}
        description={tp("dependencyRemoveText", { title: removeTarget?.dependency.title ?? "" })}
        confirmLabel={t("remove")}
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (removeTarget) remove(removeTarget.dependencyId);
        }}
      />
    </SectionCard>
  );
}
