"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleFollow, getFollowState } from "@/actions/follow";
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from "@/lib/utils";
import type { ProfileType } from "@/lib/follows";

export function FollowButton({
  followingUserId,
  profileType,
  locale,
  className,
  size = "sm",
}: {
  followingUserId: string;
  profileType: ProfileType;
  locale: string;
  className?: string;
  size?: "sm" | "default";
}) {
  const appToast = useAppToast();
  const t = useTranslations("ecosystem");
  const [following, setFollowing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getFollowState(followingUserId, profileType).then((r) => {
      if (r.success) {
        setFollowing(r.data.following);
      }
      setLoaded(true);
    });
  }, [followingUserId, profileType]);

  return (
    <Button
      type="button"
      size={size}
      variant={following ? "outline" : "default"}
      disabled={pending || !loaded}
      aria-pressed={following}
      className={cn(
        "transition-colors duration-fast",
        following && "border-violet-bright/40 bg-violet-soft text-violet-bright",
        className
      )}
      onClick={() =>
        startTransition(async () => {
          const r = await toggleFollow(followingUserId, profileType);
          if (r.success) {
            setFollowing(r.data.following);
          } else if (r.error === "Unauthorized") {
            window.location.href = `/${locale}/login`;
          } else {
            appToast.error(r.error);
          }
        })
      }
    >
      {following ? (
        <>
          <UserCheck className="h-4 w-4" aria-hidden />
          {t("followingState")}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" aria-hidden />
          {t("follow")}
        </>
      )}
    </Button>
  );
}
