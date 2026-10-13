import { getAdSettings, getPopupAds } from "@/lib/ads";
import { getUserAdExperience } from "@/lib/ad-experience";
import { AdPopup } from "@/components/ads/ad-popup";
import { AdGate } from "@/components/ads/ad-gate";

/** Pop-up für Gäste rendern; AdGate blendet es für werbefreie oder „reduzierte“ Nutzer aus. */
export async function AdPopupSlot() {
  const settings = await getAdSettings();
  if (!settings.globalAdsEnabled || !settings.popupAdsEnabled) return null;

  const ads = await getPopupAds();
  if (ads.length === 0) return null;

  const guestLevel = await getUserAdExperience(null, null);

  return (
    <AdGate guestLevel={guestLevel} hideWhenReduced>
      <AdPopup ad={ads[0]} />
    </AdGate>
  );
}
