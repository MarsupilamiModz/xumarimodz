import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getMyCreatorApplication } from "@/actions/applications";
import { CreatorApplicationForm } from "@/components/applications/creator-application-form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/config";

export default async function BecomeCreatorPage({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  setRequestLocale(locale);
  const user = await requireAuth(`/${locale}/login`);
  const existing = await getMyCreatorApplication(user.id);

  if (existing && existing.status !== "REJECTED") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Card className="p-6">
          <Badge className="mb-3">{existing.status.replace("_", " ")}</Badge>
          <h1 className="h1-display">Creator application</h1>
          <p className="text-muted-foreground mt-2">
            Your application was submitted on {new Date(existing.createdAt).toLocaleDateString()}.
            {existing.adminNotes && ` Note: ${existing.adminNotes}`}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="h1-display mb-6">Become a Creator</h1>
      <CreatorApplicationForm userEmail={user.email} />
    </div>
  );
}
