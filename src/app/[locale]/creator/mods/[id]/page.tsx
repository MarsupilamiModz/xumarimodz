import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getModForEdit } from "@/actions/mods";
import { getModDependencies } from "@/lib/mod-dependencies";
import { ModMediaUploader } from "@/components/mods/mod-media-uploader";
import { CreatorModVersionUpload } from "@/components/creator/creator-mod-version-upload";
import { CreatorModVersionManager } from "@/components/creator/creator-mod-version-manager";
import { CreatorModDependenciesEditor } from "@/components/creator/creator-mod-dependencies-editor";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/lib/auth";
import { getMediaSettings } from "@/lib/media-settings";
import { mapModMedia } from "@/lib/mod-media";
import type { Locale } from "@/i18n/config";

export default async function ManageModPage(
  props: {
    params: Promise<{ locale: Locale; id: string }>;
  }
) {
  const params = await props.params;

  const {
    locale,
    id
  } = params;

  await requireAuth(`/${locale}/login`);
  const [result, mediaSettings, dependencies] = await Promise.all([
    getModForEdit(id),
    getMediaSettings(),
    getModDependencies(id).catch(() => []),
  ]);

  if (!result.success) notFound();
  const mod = result.data;
  const tp = await getTranslations("creatorPages.modEditor");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        level="h2"
        className="mb-0"
        title={mod.title}
        description={tp("description")}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/${locale}/mods/${mod.slug}`}>
              <ExternalLink className="h-4 w-4" aria-hidden />
              {tp("viewPublic")}
            </Link>
          </Button>
        }
      />

      <CreatorModVersionUpload modId={mod.id} />

      <CreatorModVersionManager modId={mod.id} versions={mod.versions} />

      <CreatorModDependenciesEditor
        modId={mod.id}
        gameId={mod.game.id}
        initial={dependencies}
      />

      <ModMediaUploader
        modId={mod.id}
        media={mapModMedia(mod.media)}
        settings={mediaSettings}
      />
    </div>
  );
}
