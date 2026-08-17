export const CSV_MAX_BYTES = 1_000_000;
export const CSV_MAX_ROWS = 500;

export type CsvTable = {
  headers: string[];
  rows: string[][];
};

export function parseCsv(input: string): CsvTable {
  const text = input.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter =
    countOutsideQuotes(firstLine, ";") > countOutsideQuotes(firstLine, ",")
      ? ";"
      : ",";
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      if (field.length > 0) throw new Error("csv_invalid_quote");
      quoted = true;
    } else if (char === delimiter) {
      record.push(field.trim());
      field = "";
    } else if (char === "\n") {
      record.push(field.trim());
      if (record.some((value) => value !== "")) records.push(record);
      record = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (quoted) throw new Error("csv_unclosed_quote");
  record.push(field.trim());
  if (record.some((value) => value !== "")) records.push(record);
  if (records.length < 2) throw new Error("csv_without_rows");

  const headers = records[0].map(
    (value, index) => value || `Coluna ${index + 1}`,
  );
  const rows = records.slice(1);
  if (rows.length > CSV_MAX_ROWS) throw new Error("csv_too_many_rows");
  return { headers, rows };
}

function countOutsideQuotes(value: string, character: string) {
  let quoted = false;
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '"') {
      if (quoted && value[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && value[index] === character) count += 1;
  }
  return count;
}

export function csvCell(row: string[], index: number | null) {
  return index === null ? "" : (row[index] ?? "").trim();
}

export function escapeCsvCell(value: string | number) {
  const text = String(value);
  return /[",;\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createCsv(records: Array<Array<string | number>>) {
  return records.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}
