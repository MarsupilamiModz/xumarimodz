import { redirect } from "next/navigation";

/** Kurzlink: /owner führt ins ACP (eine eigene Seite /admin/owner gibt es nicht – vorher 404). */
export default async function OwnerRedirectPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  redirect(`/${locale}/admin`);
}
