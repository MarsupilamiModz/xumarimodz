import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SESSION_ONLY_COOKIE, applySessionOnly } from "@/lib/supabase/session-cookie";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            const sessionOnly = cookieStore.get(SESSION_ONLY_COOKIE)?.value === "1";
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, applySessionOnly(options, sessionOnly))
            );
          } catch {
            // Called from Server Component
          }
        },
      },
    }
  );
}

export async function createServiceClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
