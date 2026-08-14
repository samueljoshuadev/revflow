import { Link2Off, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { getMessageCenter } from "@/services/messages";
import { requireWorkspace } from "@/services/workspace";

import { sendWhatsAppMessage } from "./actions";

export const metadata = { title: "WhatsApp" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { organization } = await requireWorkspace();
  const data = await getMessageCenter(organization.id, params.conversation);
  const connected = data.connection?.status === "connected";

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Relacionamento"
        title="WhatsApp"
        description="Conversas e estados de entrega persistidos por organização."
      />
      {(params.error || params.message) && (
        <p role="status" className={`mt-6 rounded-xl border px-4 py-3 text-sm ${params.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {params.error ?? params.message}
        </p>
      )}
      {!connected && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Link2Off className="mt-0.5 size-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              WhatsApp Cloud API não configurada
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-700">
              Mensagens não serão simuladas. Configure token, phone number ID,
              opt-in e webhook verificado para ativar envio e recebimento.
            </p>
          </div>
        </div>
      )}
      <div className="mt-6 grid min-h-[560px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-gray-200 lg:border-r lg:border-b-0">
          <div className="border-b border-gray-100 p-4 text-xs font-semibold text-gray-700">
            Conversas
          </div>
          {data.conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="mx-auto size-6 text-gray-300" />
              <p className="mt-2 text-xs leading-5 text-gray-400">
                Nenhuma conversa real recebida.
              </p>
            </div>
          ) : (
            <div>
              {data.conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/messages?conversation=${conversation.id}`}
                  className={cn(
                    "block border-b border-gray-100 p-4 hover:bg-gray-50",
                    data.selected?.id === conversation.id && "bg-violet-50",
                  )}
                >
                  <p className="truncate text-sm font-medium text-gray-800">
                    {conversation.contact_name ??
                      conversation.external_contact_id}
                  </p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {conversation.status === "open" ? "Aberta" : "Encerrada"}
                    {conversation.opt_out_at ? " · opt-out" : ""}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </aside>
        <section className="flex flex-col">
          {!data.selected ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <ShieldCheck className="size-8 text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">
                Selecione uma conversa quando a integração estiver ativa.
              </p>
            </div>
          ) : (
            <>
              <header className="border-b border-gray-100 p-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  {data.selected.contact_name ??
                    data.selected.external_contact_id}
                </h2>
                <p className="mt-1 text-[10px] text-gray-400">
                  Histórico imutável do provedor
                </p>
              </header>
              <div className="flex-1 space-y-3 bg-gray-50 p-5">
                {data.messages.map((message) => (
                  <article
                    key={message.id}
                    className={cn(
                      "max-w-[78%] rounded-xl px-3 py-2.5 text-sm shadow-xs",
                      message.direction === "outbound"
                        ? "ml-auto bg-violet-600 text-white"
                        : "bg-white text-gray-700",
                    )}
                  >
                    <p className="whitespace-pre-wrap">
                      {message.body || `[${message.message_type}]`}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-right text-[9px]",
                        message.direction === "outbound"
                          ? "text-violet-200"
                          : "text-gray-400",
                      )}
                    >
                      {message.status} ·{" "}
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(message.created_at))}
                    </p>
                  </article>
                ))}
              </div>
              {connected && (
                <form action={sendWhatsAppMessage} className="border-t border-gray-100 bg-white p-4">
                  <input type="hidden" name="conversationId" value={data.selected.id} />
                  <Textarea name="body" rows={2} maxLength={4096} placeholder="Escreva uma mensagem dentro da janela de atendimento..." required />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] text-gray-400">Fora da janela de 24 horas, use um template aprovado.</p>
                    <button className="h-9 shrink-0 rounded-lg bg-emerald-600 px-4 text-xs font-medium text-white hover:bg-emerald-700">Enviar</button>
                  </div>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
