"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("workspace_render_failed", { digest: error.digest });
  }, [error]);
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <section className="max-w-md text-center">
        <AlertTriangle className="mx-auto size-9 text-amber-500" />
        <h1 className="mt-4 text-xl font-semibold text-gray-950">
          Não foi possível carregar esta área
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          A falha foi isolada e nenhum dado sensível foi exibido. Tente
          novamente.
        </p>
        <button
          onClick={reset}
          className="mt-5 h-9 rounded-lg bg-gray-950 px-4 text-sm font-medium text-white"
        >
          Tentar novamente
        </button>
      </section>
    </div>
  );
}
