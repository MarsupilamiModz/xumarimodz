import { getAdsForLocation, getAdSettings, type AdLocation } from "@/lib/ads";
import { getUserAdExperience } from "@/lib/ad-experience";
import { AdSlot } from "@/components/ads/ad-slot";
import { AdGate } from "@/components/ads/ad-gate";

type AdLocationSlotProps = {
  location: AdLocation;
  className?: string;
};

/**
 * Rendert die Werbung für Gäste (ohne Cookies, Seite bleibt cachebar); ob ein angemeldeter Nutzer
 * sie sieht, entscheidet AdGate im Browser.
 */
export async function AdLocationSlot({ location, className }: AdLocationSlotProps) {
  const settings = await getAdSettings();
  if (!settings.globalAdsEnabled) return null;
  if (settings.placementEnabled?.[location] === false) return null;

  const ads = await getAdsForLocation(location);
  if (ads.length === 0) return null;

  const guestLevel = await getUserAdExperience(null, null);

  return (
    <AdGate guestLevel={guestLevel} className={className}>
      {/* Bei „reduziert“ nur die erste Fläche */}
      {ads.map((ad, i) => (
        <div key={ad.id} className={i > 0 ? "ad-extra" : undefined}>
          <AdSlot ad={ad} className="mb-4" />
        </div>
      ))}
    </AdGate>
  );
}
