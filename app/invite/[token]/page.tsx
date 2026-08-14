import { ShieldCheck } from "lucide-react";

import { acceptInvitation } from "./actions";
import { Brand } from "@/components/brand";
import { SetupRequired } from "@/components/setup-required";
import { isSupabaseConfigured } from "@/lib/env";
import { requireUser } from "@/services/auth";

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupRequired />;
  await requireUser();
  const { token } = await params;
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8">
        <Brand />
        <ShieldCheck className="mt-8 size-10 text-brand" />
        <h1 className="mt-5 text-2xl font-semibold text-gray-950">
          Entrar no workspace
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          O convite só será aceito se o e-mail da sua conta for exatamente o
          e-mail convidado.
        </p>
        {error && (
          <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <form action={acceptInvitation} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <button className="h-11 w-full rounded-lg bg-gray-950 text-sm font-medium text-white">
            Aceitar convite
          </button>
        </form>
      </section>
    </main>
  );
}
