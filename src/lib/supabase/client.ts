import { createBrowserClient, parseCookieHeader, serializeCookieHeader, type CookieOptions } from "@supabase/ssr";
import { SESSION_ONLY_COOKIE, applySessionOnly } from "@/lib/supabase/session-cookie";

function isSessionOnly() {
  return document.cookie.split("; ").some((c) => c === `${SESSION_ONLY_COOKIE}=1`);
}

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return parseCookieHeader(document.cookie).map((c) => ({ name: c.name, value: c.value ?? "" }));
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        const sessionOnly = isSessionOnly();
        for (const { name, value, options } of cookiesToSet) {
          document.cookie = serializeCookieHeader(name, value, applySessionOnly(options, sessionOnly));
        }
      },
    },
  });
}

/** Vor dem Login aufrufen: `remember = false` macht die Anmeldung zur Browser-Sitzung. */
export function setRememberMe(remember: boolean) {
  document.cookie = remember
    ? `${SESSION_ONLY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
    : `${SESSION_ONLY_COOKIE}=1; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
