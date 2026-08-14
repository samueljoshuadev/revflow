import { Brand } from "@/components/brand";
import { Input, Label } from "@/components/ui/field";

import { updatePassword } from "./actions";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8">
        <Brand />
        <h1 className="mt-8 text-2xl font-semibold text-gray-950">
          Crie uma nova senha
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Use no mínimo 8 caracteres e não reutilize uma senha comprometida.
        </p>
        {error && (
          <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <form action={updatePassword} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <Label htmlFor="confirmation">Confirmar senha</Label>
            <Input
              id="confirmation"
              name="confirmation"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <button className="h-11 w-full rounded-lg bg-gray-950 text-sm font-medium text-white">
            Atualizar senha
          </button>
        </form>
      </section>
    </main>
  );
}
