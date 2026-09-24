// Browser-taugliche API-Scopes und Vorlagen (ohne crypto/Prisma, für das ACP-Panel).
export type ApiScope =
  | "mods:read"
  | "games:read"
  | "creators:read"
  | "collections:read"
  | "downloads:meta"
  | "upload:write"
  | "files:read";

export const API_SCOPES: ApiScope[] = [
  "mods:read",
  "games:read",
  "creators:read",
  "collections:read",
  "downloads:meta",
  "upload:write",
  "files:read",
];

export const API_KEY_PRESETS: Record<
  string,
  { label: string; scopes: ApiScope[]; rateLimit: number }
> = {
  upload: { label: "Upload API", scopes: ["upload:write"], rateLimit: 1000 },
  download: { label: "Download API", scopes: ["downloads:meta", "mods:read", "files:read"], rateLimit: 5000 },
  readonly: {
    label: "Read only",
    scopes: ["mods:read", "games:read", "creators:read", "collections:read", "downloads:meta"],
    rateLimit: 10000,
  },
  full: { label: "Full access", scopes: [], rateLimit: 10000 },
};
