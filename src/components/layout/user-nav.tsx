"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  LogOut,
  Shield,
  LifeBuoy,
  User,
  Palette,
  Package,
  Handshake,
} from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/lazy-client";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { isStaff, isDesigner, isCreator, isPartner } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { formatDisplayName } from "@/lib/display-name";
import { getSafeLocale } from "@/lib/i18n/safe-locale";

const NotificationCenter = dynamic(
  () => import("@/components/layout/notification-center").then((m) => m.NotificationCenter),
  { ssr: false, loading: () => null }
);

export type NavUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isPremium: boolean;
  permissions?: import("@/lib/permissions").PermissionKey[];
  /** Werbestufe dieses Nutzers (/api/auth/me); steuert AdGate im Browser. */
  adLevel?: "full" | "reduced" | "none";
  /** Slug der aktiven Mitgliedschaft (/api/auth/me), z. B. für die Premium-Seite. */
  planSlug?: string | null;
};

export function UserNav({ locale, user }: { locale: string; user: NavUser }) {
  const router = useRouter();
  const t = useTranslations("nav");
  const displayName = formatDisplayName(user);
  const safeLocale = getSafeLocale(locale);

  async function handleLogout() {
    const supabase = await getBrowserSupabase();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {user?.id ? <NotificationCenter locale={safeLocale} userId={user.id} /> : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2" aria-label={t("userMenu")}>
          <UserAvatar src={user.avatarUrl} name={displayName} className="h-8 w-8" />
          <span className="hidden max-w-[160px] truncate text-sm font-medium text-ink lg:inline">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/dashboard`} className="cursor-pointer">
            <LayoutDashboard className="h-4 w-4" aria-hidden /> {t("account")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/dashboard/support`} className="cursor-pointer">
            <LifeBuoy className="h-4 w-4" aria-hidden /> {t("support")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/dashboard/settings`} className="cursor-pointer">
            <User className="h-4 w-4" aria-hidden /> {t("profile")}
          </Link>
        </DropdownMenuItem>
        {isCreator(user.role) && (
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/creator`} className="cursor-pointer">
              <Package className="h-4 w-4" aria-hidden /> {t("creatorStudio")}
            </Link>
          </DropdownMenuItem>
        )}
        {isPartner(user.role) && (
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/partner`} className="cursor-pointer">
              <Handshake className="h-4 w-4" aria-hidden /> {t("partnerStudio")}
            </Link>
          </DropdownMenuItem>
        )}
        {isDesigner(user.role) && (
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/designer`} className="cursor-pointer">
              <Palette className="h-4 w-4" aria-hidden /> {t("designStudio")}
            </Link>
          </DropdownMenuItem>
        )}
        {isStaff(user.role) && (
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/admin`} className="cursor-pointer">
              <Shield className="h-4 w-4" aria-hidden /> {t("adminPanel")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-danger focus:text-danger">
          <LogOut className="h-4 w-4" aria-hidden /> {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
