import { colors } from "@/styles/tokens";
import type { TeamRoleGroup } from "@prisma/client";

export const TEAM_ROLE_GROUPS: Array<{
  key: TeamRoleGroup;
  title: string;
  defaultColor: string;
}> = [
  { key: "OWNER", title: "OWNER", defaultColor: colors.warning },
  { key: "ADMINISTRATOR", title: "ADMINISTRATORS", defaultColor: colors.danger },
  { key: "MANAGER", title: "MANAGERS", defaultColor: colors.violetBright },
  { key: "SUPPORT", title: "SUPPORT", defaultColor: colors.success },
  { key: "MODERATOR", title: "MODERATORS", defaultColor: colors.violetBright },
  { key: "DESIGNER", title: "DESIGNERS", defaultColor: colors.inkMuted },
  { key: "CREATOR", title: "CREATORS", defaultColor: colors.inkMuted },
] as const;

export function teamRoleTitle(group: TeamRoleGroup) {
  return TEAM_ROLE_GROUPS.find((entry) => entry.key === group)?.title ?? group;
}

export function teamRoleColor(group: TeamRoleGroup, override?: string | null) {
  return override || TEAM_ROLE_GROUPS.find((entry) => entry.key === group)?.defaultColor || colors.violetBright;
}
