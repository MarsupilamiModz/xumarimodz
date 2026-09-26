"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { ModDependencyRelation } from "@prisma/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [deps, setDeps] = useState(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [relation, setRelation] = useState<ModDependencyRelation>("REQUIRED");
  const [minVersion, setMinVersion] = useState("");
  const [notes, setNotes] = useState("");
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
        toast({ title: "toast.dependencyAdded" });
        window.location.reload();
      } else toast({ title: r.error, variant: "destructive" });
    });
  }

  function remove(dependencyId: string) {
    startTransition(async () => {
      const r = await removeModDependency(modId, dependencyId);
      if (r.success) {
        setDeps((d) => d.filter((x) => x.dependencyId !== dependencyId));
        toast({ title: "toast.removed" });
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t("title")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          {deps.length === 0 ? (
            <li className="text-muted-foreground">{t("noDependencies")}</li>
          ) : (
            deps.map((d) => (
              <li key={d.id} className="flex justify-between items-center">
                <span>
                  {d.dependency.title}
                  <span
                    className={`ml-2 ${
                      d.relation === "CONFLICT" ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    ({relationLabel(d.relation, d.isRequired, t)})
                  </span>
                </span>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(d.dependencyId)}>
                  {t("remove")}
                </Button>
              </li>
            ))
          )}
        </ul>

        <div className="space-y-2 border-t border-border/30 pt-4">
          <label className="text-sm font-medium">{t("addDependencyLabel")}</label>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <Button variant="outline" disabled={pending} onClick={search}>
              {t("search")}
            </Button>
          </div>
          <Select value={relation} onValueChange={(v) => setRelation(v as ModDependencyRelation)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="REQUIRED">{t("selectRequired")}</SelectItem>
              <SelectItem value="OPTIONAL">{t("selectOptional")}</SelectItem>
              <SelectItem value="CONFLICT">{t("selectIncompatible")}</SelectItem>
            </SelectContent>
          </Select>
          {relation !== "CONFLICT" && (
            <Input
              value={minVersion}
              onChange={(e) => setMinVersion(e.target.value)}
              placeholder={t("minVersionPlaceholder")}
            />
          )}
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
          />
          {results.length > 0 && (
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {results.map((m) => (
                <li key={m.id}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    disabled={pending}
                    onClick={() => add(m.id)}
                  >
                    {m.title}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
