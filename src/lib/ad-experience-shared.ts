// Ohne Serverzugriff – auch in Client-Komponenten importierbar (AdGate).
export type AdExperienceLevel = "full" | "reduced" | "none";

export function shouldRenderAds(level: AdExperienceLevel): boolean {
  return level !== "none";
}

export function adDensityClass(level: AdExperienceLevel): string {
  if (level === "reduced") return "ad-density-reduced opacity-90";
  return "";
}
