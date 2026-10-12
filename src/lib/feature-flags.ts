import { getSiteSetting, setSiteSettingSafe } from "@/lib/site-settings";
import { unstable_cache } from "next/cache";
import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAGS_KEY, type FeatureFlagKey, type FeatureFlags } from "@/lib/feature-flags-shared";

export * from "@/lib/feature-flags-shared";

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const stored = await getSiteSetting<Partial<FeatureFlags>>(FEATURE_FLAGS_KEY, {});
  return { ...DEFAULT_FEATURE_FLAGS, ...stored };
}

export async function saveFeatureFlags(flags: FeatureFlags) {
  const saved = await setSiteSettingSafe(FEATURE_FLAGS_KEY, flags);
  if (!saved.ok) throw new Error(saved.error);
}

export const getCachedFeatureFlags = unstable_cache(
  () => getFeatureFlags(),
  ["feature-flags"],
  { revalidate: 30 }
);

export async function isFeatureEnabled(flag: FeatureFlagKey): Promise<boolean> {
  const flags = await getCachedFeatureFlags();
  return flags[flag] !== false;
}
