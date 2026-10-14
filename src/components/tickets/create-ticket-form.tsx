"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { TicketCategory } from "@prisma/client";
import { createTicket } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { TICKET_CREATE_CATEGORIES } from "@/lib/ticket-labels";

export function CreateTicketForm({ locale }: { locale: string }) {
  const t = useTranslations("support");
  const tn = useTranslations("accountPages.supportNew");
  const ts = useTranslations("status");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<TicketCategory>("GENERAL_SUPPORT");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createTicket({
        subject: form.get("subject") as string,
        category,
        message: form.get("message") as string,
      });
      if (result.success) {
        toast({ title: "toast.ticketCreated", description: result.data.ticketNumber });
        router.push(`/${locale}/dashboard/support/${result.data.ticketId}`);
      } else {
        toast({ title: "toast.error", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <div className="rounded-lg border border-line bg-raised p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="ticket-category" className="label-text">{tn("categoryLabel")}</label>
          <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
            <SelectTrigger id="ticket-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_CREATE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {ts(`category.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ticket-subject" className="label-text">{t("subject")}</label>
          <Input id="ticket-subject" name="subject" required minLength={5} placeholder={tn("subjectPlaceholder")} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ticket-message" className="label-text">{t("message")}</label>
          <Textarea
            id="ticket-message"
            name="message"
            required
            minLength={10}
            rows={6}
            placeholder={tn("messagePlaceholder")}
          />
        </div>
        <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">
          {pending ? tn("sending") : t("submit")}
        </Button>
      </form>
    </div>
  );
}
