import { redirect } from "next/navigation";

/** Kurzlink: /owner führt ins Owner-Center im ACP. */
export default function OwnerRedirectPage({ params: { locale } }: { params: { locale: string } }) {
  redirect(`/${locale}/admin/owner`);
}
