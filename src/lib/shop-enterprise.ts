import { prisma } from "@/lib/db";
import { DEFAULT_SHOP_PRODUCT_TYPES } from "@/lib/shop-enterprise-shared";

export * from "@/lib/shop-enterprise-shared";

export async function ensureDefaultShopProductTypes() {
  for (const type of DEFAULT_SHOP_PRODUCT_TYPES) {
    await prisma.shopProductTypeDefinition.upsert({
      where: { slug: type.slug },
      create: {
        slug: type.slug,
        name: type.name,
        sortOrder: type.sortOrder,
        isActive: true,
        isCustom: true,
      },
      update: {},
    });
  }
}
