import { prismaModelExists } from "@/lib/prisma-schema";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";

export async function MembershipCampaignBanner({ locale }: { locale: string }) {
  try {
    if (!prismaModelExists("MembershipCampaign")) return null;

    const campaigns = await prisma.membershipCampaign.findMany({
      where: { isActive: true, isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 1,
    });

    const campaign = campaigns[0];
    if (!campaign) return null;

    const remaining = Math.max(0, campaign.totalSlots - campaign.soldSlots);
    if (remaining <= 0) return null;

    const t = await getTranslations("premium");

    return (
      <div className="page-container pt-4">
        <Link
          href={`/${locale}/premium`}
          className="block rounded-lg border border-line bg-raised p-4 transition-colors duration-fast hover:border-line-control"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {campaign.badgeLabel && <Badge className="mb-2">{campaign.badgeLabel}</Badge>}
              <p className="font-semibold text-ink">{campaign.bannerText ?? campaign.title}</p>
              {campaign.description && <p className="mt-1 text-sm text-ink-muted">{campaign.description}</p>}
            </div>
            <p className="text-sm font-semibold tabular-nums text-ink">
              {t("campaignRemaining", { remaining, total: campaign.totalSlots })}
            </p>
          </div>
        </Link>
      </div>
    );
  } catch {
    return null;
  }
}
