"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Package } from "lucide-react";
import { createExclusiveProgram } from "@/actions/exclusive";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, controlClassName } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from "@/lib/utils";
import type { ExclusiveProgramType } from "@prisma/client";

type ModOption = { id: string; title: string; slug: string };

const labelClass = "label-text mb-1.5 block text-ink-muted";

export function ExclusiveProgramForm({
  locale,
  mods,
}: {
  locale: string;
  mods: ModOption[];
}) {
  const tp = useTranslations("creatorPages.exclusive");
  const tx = useTranslations("common.cx.exclusiveProgram");
  const te = useTranslations("ecosystem");
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [modId, setModId] = useState(mods[0]?.id ?? "");
  const [type, setType] = useState<ExclusiveProgramType>("CLOSED_BETA");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxSlots, setMaxSlots] = useState("");
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [ndaRequired, setNdaRequired] = useState(false);
  const [discordRequired, setDiscordRequired] = useState(false);

  const submit = () => {
    if (!modId || !title.trim()) {
      appToast.error(tp("required"));
      return;
    }
    startTransition(async () => {
      const result = await createExclusiveProgram({
        modId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        maxSlots: maxSlots ? Number(maxSlots) : undefined,
        waitlistEnabled,
        ndaRequired,
        discordRequired,
      });
      if (result.success) {
        appToast.saved();
        router.push(`/${locale}/creator/exclusive/${result.data.id}`);
      } else {
        appToast.error(result.error);
      }
    });
  };

  if (mods.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={tp("noModsTitle")}
        description={tp("noModsText")}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/creator/mods/new`}>{te("upload")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <SectionCard className="max-w-xl">
      <div className="space-y-4">
        <div>
          <label htmlFor="exclusive-mod" className={labelClass}>{tp("fieldMod")}</label>
          <select
            id="exclusive-mod"
            value={modId}
            onChange={(e) => setModId(e.target.value)}
            className={cn(controlClassName, "h-9")}
          >
            {mods.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="exclusive-type" className={labelClass}>{tp("fieldType")}</label>
          <select
            id="exclusive-type"
            value={type}
            onChange={(e) => setType(e.target.value as ExclusiveProgramType)}
            className={cn(controlClassName, "h-9")}
          >
            <option value="CLOSED_ALPHA">{tx("programTypeClosedAlpha")}</option>
            <option value="CLOSED_BETA">{tx("programTypeClosedBeta")}</option>
            <option value="INVITE_ONLY">{tx("programTypeInviteOnly")}</option>
          </select>
        </div>
        <div>
          <label htmlFor="exclusive-title" className={labelClass}>{tp("fieldTitle")}</label>
          <Input id="exclusive-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="exclusive-description" className={labelClass}>{tp("fieldDescription")}</label>
          <Textarea id="exclusive-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </div>
        <div>
          <label htmlFor="exclusive-slots" className={labelClass}>{tp("fieldMaxSlots")}</label>
          <Input id="exclusive-slots" type="number" min={1} value={maxSlots} onChange={(e) => setMaxSlots(e.target.value)} />
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm text-ink">
            <Switch checked={waitlistEnabled} onCheckedChange={setWaitlistEnabled} />
            {tp("waitlist")}
          </label>
          <label className="flex items-center gap-3 text-sm text-ink">
            <Switch checked={ndaRequired} onCheckedChange={setNdaRequired} />
            {tp("nda")}
          </label>
          <label className="flex items-center gap-3 text-sm text-ink">
            <Switch checked={discordRequired} onCheckedChange={setDiscordRequired} />
            {tp("discord")}
          </label>
        </div>
        <Button disabled={pending} aria-busy={pending} onClick={submit}>
          {tp("launch")}
        </Button>
      </div>
    </SectionCard>
  );
}
