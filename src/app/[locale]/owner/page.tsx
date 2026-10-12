import { redirect } from "next/navigation";

/** Kurzlink: /owner führt ins Owner-Center im ACP. */
export default async function OwnerRedirectPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  redirect(`/${locale}/admin/owner`);
}
