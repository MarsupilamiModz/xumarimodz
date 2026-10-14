"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Globe,
  Instagram,
  Mail,
  MessageCircle,
  Twitch,
  Twitter,
  Users,
  Youtube,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SafeImage } from "@/components/ui/safe-image";
import type { PublicTeamMember } from "@/lib/team-profiles";
import { TEAM_ROLE_GROUPS, teamRoleColor } from "@/lib/team-page";

type Dept = { id: string; name: string; slug: string; description: string | null };

type Props = {
  departments: Dept[];
  members: PublicTeamMember[];
  contactTicketHref?: string;
};

/** Profilbild mit Rahmen in der Rollenfarbe (aus den Teameinstellungen). */
function MemberAvatar({ member, size }: { member: PublicTeamMember; size: "sm" | "lg" }) {
  const color = teamRoleColor(member.roleGroup, member.roleColor);
  const box = size === "sm" ? "h-16 w-16 border-2" : "h-24 w-24 border-4";
  return (
    <div className={`relative overflow-hidden rounded-full bg-raised ${box}`} style={{ borderColor: color }}>
      {member.avatarUrl ? (
        <SafeImage src={member.avatarUrl} alt="" fill className="object-cover" sizes={size === "sm" ? "64px" : "96px"} />
      ) : (
        <div className={`flex h-full items-center justify-center font-bold text-ink ${size === "sm" ? "text-xl" : "text-3xl"}`} aria-hidden>
          {member.name.charAt(0)}
        </div>
      )}
    </div>
  );
}

export function TeamPageClient({ members, contactTicketHref }: Props) {
  const t = useTranslations("publicPages.team");
  const [selected, setSelected] = useState<PublicTeamMember | null>(null);

  const grouped = useMemo(
    () =>
      TEAM_ROLE_GROUPS.map((group) => ({
        ...group,
        members: members.filter((member) => member.roleGroup === group.key),
      })).filter((group) => group.members.length > 0),
    [members]
  );

  const roleBadge = (member: PublicTeamMember) => member.roleBadge || t(`role.${member.roleGroup}`);

  return (
    <div className="page-section">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {grouped.length === 0 ? (
        <EmptyState icon={Users} title={t("emptyTitle")} description={t("emptyText")} />
      ) : (
        <div className="space-y-12">
          {grouped.map((group) => (
            <section key={group.key} aria-labelledby={`team-${group.key}`} className="space-y-4">
              <h2 id={`team-${group.key}`} className="text-lg font-semibold text-ink">
                {t(`group.${group.key}`)}
              </h2>

              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.members.map((member) => (
                  <li
                    key={member.id}
                    className="relative overflow-hidden rounded-lg border border-line bg-raised transition-colors duration-fast hover:border-line-control focus-within:border-line-control"
                  >
                    <div
                      className="relative h-24"
                      style={{ backgroundColor: `${teamRoleColor(member.roleGroup, member.roleColor)}33` }}
                    >
                      {member.bannerUrl && (
                        <SafeImage src={member.bannerUrl} alt="" fill className="object-cover opacity-60" sizes="400px" />
                      )}
                      <div className="absolute -bottom-8 left-4">
                        <MemberAvatar member={member} size="sm" />
                      </div>
                    </div>
                    <div className="space-y-2 p-4 pt-10">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-ink">
                          {/* Ganze Karte öffnet das Profil; Kontakt-Links liegen darüber. */}
                          <button
                            type="button"
                            onClick={() => setSelected(member)}
                            aria-label={t("openProfile", { name: member.name })}
                            className="text-left outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-lg focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-violet-bright"
                          >
                            {member.name}
                          </button>
                        </h3>
                        <Badge variant="secondary">{roleBadge(member)}</Badge>
                      </div>
                      {member.position && <p className="text-sm text-ink-muted">{member.position}</p>}
                      {member.description && <p className="line-clamp-3 text-sm text-ink-muted">{member.description}</p>}
                      {(member.discordUrl || member.email) && (
                        <div className="relative z-10 flex flex-wrap gap-2 pt-2">
                          {member.discordUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={member.discordUrl} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="h-4 w-4" aria-hidden /> {t("discord")}
                              </a>
                            </Button>
                          )}
                          {member.email && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={`mailto:${member.email}`}>
                                <Mail className="h-4 w-4" aria-hidden /> {t("email")}
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl overflow-hidden p-0">
          {selected && (
            <>
              <div
                className="relative h-40"
                style={{ backgroundColor: `${teamRoleColor(selected.roleGroup, selected.roleColor)}33` }}
              >
                {selected.bannerUrl && (
                  <SafeImage src={selected.bannerUrl} alt="" fill className="object-cover opacity-60" sizes="800px" />
                )}
              </div>
              <div className="relative p-6">
                <div className="-mt-20 mb-4 flex items-end gap-4">
                  <MemberAvatar member={selected} size="lg" />
                  <div className="pb-2">
                    <DialogHeader className="space-y-2 text-left">
                      <DialogTitle className="text-xl font-semibold text-ink">{selected.name}</DialogTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        {selected.position && <span className="text-sm text-ink-muted">{selected.position}</span>}
                        <Badge variant="secondary">{roleBadge(selected)}</Badge>
                      </div>
                    </DialogHeader>
                  </div>
                </div>

                {selected.description && (
                  <p className="mb-5 whitespace-pre-wrap text-sm text-ink-muted">{selected.description}</p>
                )}

                <div className="mb-5 flex flex-wrap gap-2">
                  <SocialLinks member={selected} websiteLabel={t("website")} />
                </div>

                <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                  {selected.email && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`mailto:${selected.email}`}>
                        <Mail className="h-4 w-4" aria-hidden /> {t("email")}
                      </a>
                    </Button>
                  )}
                  {selected.discordUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selected.discordUrl} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4" aria-hidden /> {t("discord")}
                      </a>
                    </Button>
                  )}
                  {contactTicketHref && (
                    <Button size="sm" asChild>
                      <a href={contactTicketHref}>{t("openTicket")}</a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SocialLinks({ member, websiteLabel }: { member: PublicTeamMember; websiteLabel: string }) {
  const links = [
    { url: member.websiteUrl, icon: Globe, label: websiteLabel },
    { url: member.youtubeUrl, icon: Youtube, label: "YouTube" },
    { url: member.twitchUrl, icon: Twitch, label: "Twitch" },
    { url: member.instagramUrl, icon: Instagram, label: "Instagram" },
    { url: member.xUrl, icon: Twitter, label: "X" },
  ].filter((link) => link.url);

  return (
    <>
      {links.map(({ url, icon: Icon, label }) => (
        <a
          key={label}
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink-muted transition-colors duration-fast hover:border-line-control hover:text-ink"
          aria-label={label}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </a>
      ))}
      {member.customLinks?.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-md border border-line px-3 text-xs text-ink-muted transition-colors duration-fast hover:border-line-control hover:text-ink"
        >
          {link.label}
        </a>
      ))}
    </>
  );
}
