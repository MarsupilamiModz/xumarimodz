// Ohne Serverzugriff – auch in Client-Komponenten importierbar.
export const FEATURE_FLAGS_KEY = "feature_flags";

export type FeatureFlagKey =
  | "shop"
  | "sounds"
  | "creator"
  | "partner"
  | "premium"
  | "ads"
  | "teamChat"
  | "tickets"
  | "collections"
  | "modpacks";

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  shop: true,
  sounds: true,
  creator: true,
  partner: true,
  premium: true,
  ads: true,
  teamChat: true,
  tickets: true,
  collections: true,
  modpacks: true,
};

export const FEATURE_FLAG_LABELS: Record<FeatureFlagKey, string> = {
  shop: "Shop",
  sounds: "Sounds",
  creator: "Creator program",
  partner: "Partner program",
  premium: "Premium memberships",
  ads: "Advertising",
  teamChat: "Team chat",
  tickets: "Support tickets",
  collections: "Collections",
  modpacks: "Modpacks",
};
