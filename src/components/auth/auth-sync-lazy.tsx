"use client";

import dynamic from "next/dynamic";

/**
 * AuthSync lädt den Supabase-Client (~45 KB). Er wird erst nach dem ersten Rendern
 * gebraucht und deshalb separat nachgeladen, statt das Seiten-Bundle zu vergrößern.
 */
export const AuthSyncLazy = dynamic(() => import("@/components/auth/auth-sync").then((m) => m.AuthSync), {
  ssr: false,
});
