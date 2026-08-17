import { Bell, Check, ExternalLink } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/services/workspace";

import { markNotificationRead } from "./actions";

export const metadata = { title: "Notificações" };

export default async function NotificationsPage() {
  const { user, organization } = await requireWorkspace();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Próximas ações"
        title="Notificações"
        description="Lembretes comerciais gerados por regras reais da sua organização."
      />
      <section className="mt-7 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <div className="divide-y divide-gray-100">
          {(data ?? []).map((item) => (
            <article
              key={item.id}
              className={`flex gap-4 p-4 sm:p-5 ${item.read_at ? "opacity-60" : ""}`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Bell className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {item.body}
                </p>
                <p className="mt-2 text-[10px] text-gray-400">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(item.created_at))}
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-2">
                {item.lead_id && (
                  <Link
                    href={`/leads/${item.lead_id}`}
                    aria-label="Abrir lead"
                    className="rounded-lg border border-gray-200 p-2 text-gray-500"
                  >
                    <ExternalLink className="size-3.5" />
                  </Link>
                )}
                {!item.read_at && (
                  <form action={markNotificationRead}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      aria-label="Marcar como lida"
                      className="rounded-lg border border-gray-200 p-2 text-gray-500"
                    >
                      <Check className="size-3.5" />
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))}
          {(data ?? []).length === 0 && (
            <div className="p-10 text-center">
              <Bell className="mx-auto size-6 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                Nenhuma notificação pendente.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
