import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permission-store";
import { canAccessTeamChat } from "@/lib/team-chat-access";
import { listChatChannelsForUser } from "@/actions/team-chat";
import { formatDisplayName } from "@/lib/display-name";
import { AdminChatPageClient } from "@/components/chat/admin-chat-page-client";

/** Team-Chat für /team-chat und /admin/chat. Zugriff wird serverseitig geprüft. */
export async function TeamChatPage({ locale, channelId }: { locale: string; channelId?: string }) {
  const user = await requireAuth(`/${locale}/login`);
  const permissions = await getEffectivePermissions({
    id: user.id,
    role: user.role,
    permissionGroupId: user.permissionGroupId,
  });
  if (!canAccessTeamChat(user, permissions)) redirect(`/${locale}/forbidden`);

  const result = await listChatChannelsForUser();
  if (!result.success) redirect(`/${locale}/forbidden`);

  return (
    <AdminChatPageClient
      locale={locale}
      userId={user.id}
      currentUserName={formatDisplayName(user)}
      currentUserRole={user.role}
      initialChannels={result.data.channels}
      initialStaff={result.data.teammates}
      initialChannelId={channelId}
    />
  );
}
