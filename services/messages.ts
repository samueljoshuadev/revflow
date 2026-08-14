import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getMessageCenter(
  organizationId: string,
  conversationId?: string,
) {
  const supabase = await createClient();
  const [conversationsResult, connectionResult] = await Promise.all([
    supabase
      .from("conversations")
      .select("*")
      .eq("organization_id", organizationId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100),
    supabase
      .from("integration_connections")
      .select("status, last_synced_at, last_error_code")
      .eq("organization_id", organizationId)
      .eq("provider", "whatsapp")
      .maybeSingle(),
  ]);
  if (conversationsResult.error) throw conversationsResult.error;
  if (connectionResult.error) throw connectionResult.error;
  const conversations = conversationsResult.data ?? [];
  const selected =
    conversations.find((item) => item.id === conversationId) ??
    conversations[0] ??
    null;
  if (!selected) {
    return {
      conversations,
      selected: null,
      messages: [],
      connection: connectionResult.data,
    };
  }
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("conversation_id", selected.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return {
    conversations,
    selected,
    messages: (messages ?? []).reverse(),
    connection: connectionResult.data,
  };
}
