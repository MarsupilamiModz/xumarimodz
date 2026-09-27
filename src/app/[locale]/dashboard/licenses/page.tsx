"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { redeemLicense, getUserLicenses } from "@/actions/licenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDate } from "@/lib/format-locale";

type Activation = {
  id: string;
  createdAt: Date;
  ipHash: string | null;
  licenseKey: {
    productType: string;
    status: string;
    mod: { title: string; slug: string } | null;
  };
};

export default function LicensesPage() {
  const t = useTranslations("ecosystem");
  const td = useTranslations("dashboard");
  const appToast = useAppToast();
  const [key, setKey] = useState("");
  const [activations, setActivations] = useState<Activation[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getUserLicenses().then((r) => {
      if (r.success) setActivations(r.data as Activation[]);
    });
  }, []);

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="h1-acp">{td("licenses")}</h1>
      <Card className="p-6">
        <p className="text-sm text-muted-foreground mb-4">{t("productLocked")}</p>
        <div className="flex gap-2">
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="MARSU-XXXXXX-XXXXXX"
            className="font-mono"
          />
          <Button
           
            disabled={pending || !key}
            onClick={() =>
              startTransition(async () => {
                const r = await redeemLicense(key);
                if (r.success) {
                  appToast.created(r.data.mod?.title ?? r.data.productType);
                  setKey("");
                  const refreshed = await getUserLicenses();
                  if (refreshed.success) setActivations(refreshed.data as Activation[]);
                } else appToast.error(r.error);
              })
            }
          >
            {t("redeemKey")}
          </Button>
        </div>
      </Card>

      <section>
        <h2 className="text-lg font-semibold mb-4">{t("myLicenses")}</h2>
        {activations.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">{t("activationHistory")}</Card>
        ) : (
          <div className="space-y-2">
            {activations.map((a) => (
              <Card key={a.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {a.licenseKey.mod?.title ?? a.licenseKey.productType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(a.createdAt)}
                  </p>
                </div>
                <Badge variant="outline">{a.licenseKey.status}</Badge>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
