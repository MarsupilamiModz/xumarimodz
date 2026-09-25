import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { locales, defaultLocale, localeRegex } from "@/i18n/config";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE,
  normalizeReferralCode,
} from "@/lib/referral-cookie";

const intlMiddleware = createMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
  // URL locale is authoritative — prevents Accept-Language redirect loops on /de/… paths.
  localeDetection: false,
});

/** Paths that must never require login (public discovery). */
const PUBLIC_PATH_PREFIXES = ["/creators", "/partners", "/team"];

const protectedPrefixes = [
  "/dashboard",
  "/admin",
  "/creator",
  "/designer",
  "/partner",
  "/team-chat",
  "/banned",
];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

function isProtectedPath(path: string): boolean {
  if (isPublicPath(path)) return false;
  return protectedPrefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

const SESSION_COOKIE_HINTS = ["sb-", "auth-token"];

function hasSessionCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) =>
    SESSION_COOKIE_HINTS.some((hint) => c.name.includes(hint))
  );
}

function isServerAction(request: NextRequest): boolean {
  return request.method === "POST" && request.headers.has("next-action");
}

function isStatelessApi(pathname: string): boolean {
  return (
    pathname === "/api/health" ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/r2/") ||
    pathname.startsWith("/api/security/") ||
    pathname.startsWith("/api/assets/") ||
    pathname.startsWith("/api/platform/")
  );
}

// ---- IP-Sperren (ACP → Sicherheit). Liste nur als Hashes, 60 s pro Instanz gecacht; bei Fehlern offen. ----
const BAN_TTL_MS = 60_000;
let banCache: { hashes: Set<string>; at: number } | null = null;
let banLoad: Promise<void> | null = null;

function ipBanSalt() {
  return process.env.IP_BAN_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "xumari";
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function loadBans(origin: string) {
  try {
    const token = await sha256Hex(`ip-ban-list:${ipBanSalt()}`);
    const res = await fetch(new URL("/api/security/ip-bans", origin), {
      headers: { "x-internal-token": token },
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { hashes?: string[] };
    banCache = { hashes: new Set(data.hashes ?? []), at: Date.now() };
  } catch {
    // Fail-open: ohne Liste niemanden aussperren; nächster Versuch nach der TTL.
    banCache = { hashes: banCache?.hashes ?? new Set(), at: Date.now() };
  }
}

async function isIpBanned(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
  if (!ip) return false;
  if (!banCache || Date.now() - banCache.at > BAN_TTL_MS) {
    banLoad ??= loadBans(request.nextUrl.origin).finally(() => {
      banLoad = null;
    });
    if (!banCache) await banLoad;
  }
  if (!banCache?.hashes.size) return false;
  return banCache.hashes.has(await sha256Hex(`${ipBanSalt()}:${ip.toLowerCase()}`));
}

function bannedResponse() {
  return new NextResponse(
    "<!doctype html><html lang=\"de\"><meta charset=\"utf-8\"><title>403</title><body style=\"font-family:system-ui;padding:40px\"><h1>Zugriff gesperrt</h1><p>Von dieser IP-Adresse ist kein Zugriff möglich. / Access from this IP address is blocked.</p></body></html>",
    { status: 403, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );
}

function mergeSessionCookies(target: NextResponse, sessionResponse: NextResponse | null) {
  sessionResponse?.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie);
  });
}

function withPathnameHeader(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return new NextRequest(request.url, { headers: requestHeaders });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Webhooks, Health-Check und die Sperrliste selbst nie sperren.
  const banExempt =
    pathname === "/api/health" || pathname.startsWith("/api/stripe/webhook") || pathname === "/api/security/ip-bans";
  if (!banExempt && (await isIpBanned(request))) {
    return bannedResponse();
  }

  if (
    pathname === "/ads.txt" ||
    pathname === "/robots.txt" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/sitemap")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    if (pathname.startsWith("/api/auth/callback") || isStatelessApi(pathname)) {
      return NextResponse.next();
    }
    if (!hasSessionCookies(request)) {
      return NextResponse.next();
    }
    const { response } = await updateSession(request);
    return response;
  }

  if (isServerAction(request)) {
    if (!hasSessionCookies(request)) return NextResponse.next();
    const { response } = await updateSession(request);
    return response;
  }

  const cookieHint = hasSessionCookies(request);

  const localeMatch = pathname.match(localeRegex);
  const locale = localeMatch?.[1] ?? defaultLocale;
  let pathWithoutLocale = pathname.replace(localeRegex, "") || "/";
  if (!pathWithoutLocale.startsWith("/")) {
    pathWithoutLocale = `/${pathWithoutLocale}`;
  }

  const isProtected = isProtectedPath(pathWithoutLocale);

  // Refresh Supabase session only where auth matters — keeps Set-Cookie headers
  // smaller on public pages (avoids nginx "upstream sent too big header" 502s).
  const sessionResult =
    cookieHint && isProtected ? await updateSession(request) : null;
  const authenticated = Boolean(sessionResult?.userId);

  // Auth entry redirect handled in login/register page SSR (avoids Supabase/Prisma mismatch loops).

  // Only redirect to login when there are no session cookies at all.
  // If cookies exist but getUser() failed, defer to SSR requireAuth (with Prisma recovery).
  if (isProtected && !authenticated && !cookieHint) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    mergeSessionCookies(redirect, sessionResult?.response ?? null);
    return redirect;
  }

  const refParam = request.nextUrl.searchParams.get("ref");
  if (refParam?.trim()) {
    const code = normalizeReferralCode(refParam);
    const registerPath = `/${locale}/register`;
    const onRegister = pathWithoutLocale === "/register" || pathWithoutLocale.startsWith("/register/");

    let response: NextResponse;
    if (!onRegister) {
      const registerUrl = new URL(registerPath, request.url);
      registerUrl.searchParams.set("ref", refParam.trim());
      response = NextResponse.redirect(registerUrl);
    } else {
      response = intlMiddleware(withPathnameHeader(request, pathname));
    }

    if (code) {
      response.cookies.set(REFERRAL_COOKIE, code, {
        maxAge: REFERRAL_COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }
    mergeSessionCookies(response, sessionResult?.response ?? null);
    return response;
  }

  const intlResponse = intlMiddleware(withPathnameHeader(request, pathname));
  mergeSessionCookies(intlResponse, sessionResult?.response ?? null);
  return intlResponse;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
