import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth";
import { userHasPermission } from "@/lib/permission-store";
import { locales, type Locale } from "@/i18n/config";
import { exportLocaleMessages } from "@/lib/localization-table";

export const dynamic = "force-dynamic";

/** JSON-Export aller Texte einer Sprache (Dateien + ACP-Änderungen). */
export async function GET(req: Request) {
  const user = await requireAuthApi();
  if (!user || !(await userHasPermission({ id: user.id, role: user.role, permissionGroupId: user.permissionGroupId }, "settings.write"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const locale = new URL(req.url).searchParams.get("locale") ?? "";
  if (!(locales as readonly string[]).includes(locale)) return NextResponse.json({ error: "Unknown language" }, { status: 400 });

  const data = await exportLocaleMessages(locale as Locale);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="messages-${locale}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
