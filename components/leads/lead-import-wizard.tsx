"use client";

import { Download, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  createCsv,
  csvCell,
  CSV_MAX_BYTES,
  parseCsv,
  type CsvTable,
} from "@/lib/csv";

const fields = [
  ["name", "Nome", true],
  ["email", "E-mail", false],
  ["phone", "Telefone", false],
  ["company", "Empresa", false],
  ["source", "Origem", false],
  ["campaign", "Campanha", false],
  ["estimatedBudget", "Valor estimado", false],
  ["summary", "Observações", false],
  ["nextAction", "Próxima ação", false],
] as const;

type Mapping = Record<(typeof fields)[number][0], number | null>;
type ImportResult = {
  rowNumber: number;
  status: "created" | "duplicate" | "invalid";
  reason?: string;
};

export function LeadImportWizard({
  services,
  members,
}: {
  services: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string }>;
}) {
  const [fileName, setFileName] = useState("");
  const [importKey, setImportKey] = useState("");
  const [table, setTable] = useState<CsvTable | null>(null);
  const [mapping, setMapping] = useState<Mapping>(() => emptyMapping());
  const [serviceId, setServiceId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[]>([]);
  const summary = useMemo(
    () => ({
      created: results.filter((item) => item.status === "created").length,
      duplicate: results.filter((item) => item.status === "duplicate").length,
      invalid: results.filter((item) => item.status === "invalid").length,
    }),
    [results],
  );

  async function selectFile(file: File | undefined) {
    setError(null);
    setResults([]);
    if (!file) return;
    if (file.size > CSV_MAX_BYTES) {
      setError("O arquivo deve ter no máximo 1 MB.");
      return;
    }
    try {
      const parsed = parseCsv(await file.text());
      setFileName(file.name);
      setImportKey(crypto.randomUUID());
      setTable(parsed);
      setMapping(autoMapping(parsed.headers));
      setStatus("idle");
    } catch (fileError) {
      setError(csvError(fileError));
      setTable(null);
    }
  }

  async function importRows() {
    if (!table || !importKey || mapping.name === null || status === "loading")
      return;
    setStatus("loading");
    setError(null);
    const rows = table.rows.map((row, index) => ({
      rowNumber: index + 2,
      name: csvCell(row, mapping.name),
      email: csvCell(row, mapping.email),
      phone: csvCell(row, mapping.phone),
      company: csvCell(row, mapping.company),
      source: csvCell(row, mapping.source),
      campaign: csvCell(row, mapping.campaign),
      estimatedBudget: csvCell(row, mapping.estimatedBudget),
      summary: csvCell(row, mapping.summary),
      nextAction: csvCell(row, mapping.nextAction),
      nextActionAt: null,
      serviceId: serviceId || null,
      ownerId: ownerId || null,
      priority,
    }));
    try {
      const response = await fetch("/api/leads/import", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importKey,
          fileName,
          rows,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        results?: ImportResult[];
        error?: string;
      } | null;
      if (!response.ok || !body?.results)
        throw new Error(body?.error ?? "import_failed");
      setResults(body.results);
      setStatus("done");
    } catch {
      setError(
        "Não foi possível concluir a importação. Revise o arquivo e tente novamente.",
      );
      setStatus("idle");
    }
  }

  function downloadErrors() {
    const failed = results.filter((item) => item.status !== "created");
    if (failed.length === 0) return;
    const csv = createCsv([
      ["linha", "status", "motivo"],
      ...failed.map((item) => [item.rowNumber, item.status, item.reason ?? ""]),
    ]);
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "revflow-erros-importacao.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <FileSpreadsheet className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-950">
              Selecionar planilha CSV
            </h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Até 500 linhas e 1 MB. O arquivo é processado no momento da
              importação e não fica armazenado.
            </p>
          </div>
        </div>
        <label className="mt-5 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 text-center hover:border-brand/50 hover:bg-brand-soft/30">
          <Upload className="size-5 text-gray-400" />
          <span className="mt-2 text-sm font-medium text-gray-700">
            {fileName || "Escolher arquivo .csv"}
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => void selectFile(event.target.files?.[0])}
          />
        </label>
      </section>

      {table && (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="text-sm font-semibold text-gray-950">
              Relacionar colunas
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Confirme onde está cada informação. Apenas Nome é obrigatório.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map(([key, label, required]) => (
                <label key={key} className="text-xs font-medium text-gray-700">
                  {label}
                  {required ? " *" : ""}
                  <select
                    value={mapping[key] ?? ""}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        [key]:
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                      }))
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                  >
                    <option value="">Não importar</option>
                    {table.headers.map((header, index) => (
                      <option key={`${header}-${index}`} value={index}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-5 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-3">
              <Select
                label="Serviço para todos"
                value={serviceId}
                onChange={setServiceId}
                options={services}
              />
              <Select
                label="Responsável para todos"
                value={ownerId}
                onChange={setOwnerId}
                options={members}
              />
              <label className="text-xs font-medium text-gray-700">
                Prioridade
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-950">Prévia</h2>
              <p className="mt-1 text-xs text-gray-500">
                {table.rows.length} linhas encontradas
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Linha</th>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Telefone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {table.rows.slice(0, 5).map((row, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-gray-400">{index + 2}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {csvCell(row, mapping.name) || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {csvCell(row, mapping.email) || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {csvCell(row, mapping.phone) || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {status === "done" && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-sm font-semibold text-emerald-950">
            Importação concluída
          </h2>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <span>{summary.created} criados</span>
            <span>{summary.duplicate} duplicados ignorados</span>
            <span>{summary.invalid} inválidos</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/leads"
              className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-medium text-white"
            >
              Ver leads
            </Link>
            {summary.duplicate + summary.invalid > 0 && (
              <button
                type="button"
                onClick={downloadErrors}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-medium text-emerald-900"
              >
                <Download className="size-3.5" /> Baixar relatório
              </button>
            )}
          </div>
        </section>
      )}
      {table && status !== "done" && (
        <button
          type="button"
          onClick={() => void importRows()}
          disabled={mapping.name === null || status === "loading"}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === "loading" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {status === "loading" ? "Importando..." : "Confirmar importação"}
        </button>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  options: Array<{ id: string; name: string }>;
}) {
  return (
    <label className="text-xs font-medium text-gray-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
      >
        <option value="">Não definir</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function emptyMapping(): Mapping {
  return Object.fromEntries(fields.map(([key]) => [key, null])) as Mapping;
}
function autoMapping(headers: string[]): Mapping {
  const aliases: Record<keyof Mapping, string[]> = {
    name: ["nome", "name"],
    email: ["email", "e-mail"],
    phone: ["telefone", "phone", "celular", "whatsapp"],
    company: ["empresa", "company"],
    source: ["origem", "source"],
    campaign: ["campanha", "campaign"],
    estimatedBudget: ["valor", "orcamento", "valor estimado"],
    summary: ["observacoes", "resumo", "notas"],
    nextAction: ["proxima acao", "next action"],
  };
  const normalized = headers.map(normalizeHeader);
  return Object.fromEntries(
    fields.map(([key]) => {
      const index = normalized.findIndex((header) =>
        aliases[key].includes(header),
      );
      return [key, index >= 0 ? index : null];
    }),
  ) as Mapping;
}
function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
function csvError(error: unknown) {
  const code = error instanceof Error ? error.message : "csv_invalid";
  if (code.includes("too_many")) return "O arquivo possui mais de 500 linhas.";
  if (code.includes("without_rows"))
    return "O CSV precisa ter cabeçalho e pelo menos uma linha.";
  return "O arquivo CSV está malformado. Verifique aspas, colunas e quebras de linha.";
}
