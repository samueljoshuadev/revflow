import { ArrowLeft, Scale } from "lucide-react";
import Link from "next/link";

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:py-16">
      <article className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-gray-500"
        >
          <ArrowLeft className="size-3.5" /> Voltar ao RevFlow
        </Link>
        <div className="mt-8 flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <Scale className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] text-violet-600 uppercase">
              Informação legal
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">
              {title}
            </h1>
            <p className="mt-2 text-xs text-gray-400">
              Versão inicial · Atualizada em {updatedAt} · Requer revisão
              jurídica antes do lançamento amplo
            </p>
          </div>
        </div>
        <div className="prose prose-gray mt-10 max-w-none space-y-7 text-sm leading-7 text-gray-600">
          {children}
        </div>
        <footer className="mt-10 border-t border-gray-100 pt-6 text-xs text-gray-400">
          Solicitações podem ser iniciadas pelo contato oficial do RevFlow:{" "}
          <a
            className="font-medium text-violet-700"
            href="https://wa.me/5511988407914"
          >
            +55 11 98840-7914
          </a>
          .
        </footer>
      </article>
    </main>
  );
}
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
