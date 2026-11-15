import type { ActivityEntry, TrackingState } from "./plan";

export type CsvTable = { headers: string[]; rows: string[][] };
export type CsvMapping = { date: number; description: number; amount: number; type: number; debit: number; credit: number };
export const CSV_MAX_BYTES = 1024 * 1024;

export function parseCsv(text: string): CsvTable {
  if (text.length > CSV_MAX_BYTES) throw new Error("Choose a CSV smaller than 1 MB.");
  text = text.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/).find(line => line.trim()) ?? "";
  const delimiter = [",", ";", "\t"].map(value => ({ value, count: first.split(value).length }))
    .sort((a,b) => b.count - a.count)[0].value;
  const records: string[][] = [];
  let row: string[] = [], field = "", quoted = false, closed = false;
  function cell() { row.push(field.trim()); field = ""; closed = false; }
  function line() {
    cell(); if (row.some(value => value !== "")) records.push(row); row = [];
    if (records.length > 1001) throw new Error("Import up to 1,000 rows at a time.");
  }
  for (let i=0; i<text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') { if (text[i+1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } }
      else field += char;
    } else if (char === '"') {
      if (field.trim() || closed) throw new Error("The CSV has an unexpected quote. Check its formatting.");
      quoted = true;
    } else if (char === delimiter) cell();
    else if (char === "\n" || char === "\r") { if (char === "\r" && text[i+1] === "\n") i++; line(); }
    else {
      if (closed && char.trim()) throw new Error("The CSV has text after a closing quote.");
      field += char;
    }
  }
  if (quoted) throw new Error("The CSV has an unfinished quoted value.");
  if (field || row.length) line();
  const headers = records.shift();
  if (!headers || headers.length < 2 || !records.length) throw new Error("Include a header row and at least one transaction.");
  if (headers.length > 50) throw new Error("Use a CSV with 50 columns or fewer.");
  if (records.some(row => row.length !== headers.length)) throw new Error("Each CSV row must have the same number of columns as its header.");
  return { headers, rows: records };
}

export function detectMapping(headers: string[]): CsvMapping {
  const normalized = headers.map(value => value.toLowerCase().replace(/[^a-z]/g, ""));
  const find = (...names: string[]) => { for (const name of names) { const index = normalized.indexOf(name); if (index >= 0) return index; } return -1; };
  return { date: find("date", "transactiondate", "posteddate", "postingdate", "postdate"),
    description: find("description", "memo", "payee", "merchant", "name", "note"),
    amount: find("amount", "transactionamount"), type: find("type", "transactiontype", "kind", "debitcredit"),
    debit: find("debit", "debits", "withdrawal", "withdrawals"), credit: find("credit", "credits", "deposit", "deposits") };
}

function money(value: string): number {
  let text = value.trim().replace(/^\$/, "");
  if (/^\(.*\)$/.test(text)) text = "-" + text.slice(1,-1).replace(/^\$/, "");
  if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text)) throw new Error("Use dollar amounts with up to two decimal places.");
  const amount = Number(text.replace(/,/g, ""));
  if (!Number.isFinite(amount) || Math.abs(amount) > 1e12) throw new Error("Amount is too large.");
  return amount;
}
function dateValue(value: string, dayFirst: boolean) {
  let year: number, month: number, day: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (iso) [,year,month,day] = iso.map(Number);
  else if (slash) { year = Number(slash[3]); month = Number(slash[dayFirst ? 2 : 1]); day = Number(slash[dayFirst ? 1 : 2]); }
  else throw new Error("Use YYYY-MM-DD or a slash date with a four-digit year.");
  const date = new Date(year!, month! - 1, day!, 12);
  if (year! < 1900 || date.getFullYear() !== year! || date.getMonth() !== month! - 1 || date.getDate() !== day!) throw new Error("Date is not valid.");
  const today = new Date(); today.setHours(23,59,59,999);
  if (date > today) throw new Error("Use a date today or earlier.");
  return date.toISOString();
}
// A stable content key makes repeated/overlapping imports idempotent.
function key(value: string) {
  let a = 2166136261, b = 5381;
  for (let i=0;i<value.length;i++) { a = Math.imul(a ^ value.charCodeAt(i),16777619); b = Math.imul(b,33) ^ value.charCodeAt(i); }
  return (a>>>0).toString(16).padStart(8,"0") + (b>>>0).toString(16).padStart(8,"0");
}
export function previewCsv(table: CsvTable, mapping: CsvMapping, existing: ActivityEntry[], positivePurchases = false, dayFirst = false) {
  const entries: ActivityEntry[] = [], errors: string[] = [];
  const seen = new Map<string,number>();
  const ids = new Set(existing.map(entry => entry.id));
  let duplicates = 0, spent = 0, received = 0;
  if (mapping.date < 0 || (mapping.amount < 0 && (mapping.debit < 0 || mapping.credit < 0))) {
    return { entries, errors: ["Choose a date column and either an amount column or both debit and credit columns."], duplicates, spent, received };
  }
  table.rows.forEach((row,index) => {
    try {
      const createdAt = dateValue(row[mapping.date] ?? "",dayFirst);
      const note = mapping.description < 0 ? "" : row[mapping.description];
      if ((note ?? "").length > 120) throw new Error("Description is longer than 120 characters.");
      let amount: number, kind: "purchase" | "income";
      if (mapping.amount < 0) {
        const debit = row[mapping.debit]?.trim() ? money(row[mapping.debit]) : 0;
        const credit = row[mapping.credit]?.trim() ? money(row[mapping.credit]) : 0;
        if (debit < 0 || credit < 0 || (!!debit && !!credit)) throw new Error("Use one positive debit or credit amount per row.");
        kind = debit ? "purchase" : "income"; amount = debit || credit;
      } else {
        const signed = money(row[mapping.amount] ?? "");
        amount = Math.abs(signed);
        const type = mapping.type < 0 ? "" : row[mapping.type].toLowerCase().trim();
        if (["purchase","debit","withdrawal","expense","sale"].includes(type)) kind = "purchase";
        else if (["income","credit","deposit"].includes(type)) kind = "income";
        else if (type) throw new Error(`Unknown type “${type}”. Use purchase/income or debit/credit.`);
        else kind = (signed < 0) !== positivePurchases ? "purchase" : "income";
      }
      if (amount < 0.01) throw new Error("Amount must be at least $0.01.");
      const date = new Date(createdAt);
      const calendarDate = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
      const identity = JSON.stringify([calendarDate,kind,amount,note ?? ""]);
      const occurrence = (seen.get(identity) ?? 0) + 1; seen.set(identity,occurrence);
      const id = `csv-${key(identity)}-${occurrence}`;
      if (ids.has(id)) { duplicates++; return; }
      entries.push({ id, kind, amount, createdAt, note: note ?? "", historyOnly: true });
      if (kind === "purchase") spent += amount; else received += amount;
    } catch (error) { errors.push(`Row ${index+2}: ${error instanceof Error ? error.message : "Check this row."}`); }
  });
  return { entries, errors, duplicates, spent: Math.round(spent*100)/100, received: Math.round(received*100)/100 };
}

export function importHistory(state: TrackingState, entries: ActivityEntry[]): TrackingState {
  const ids = new Set(state.purchases.map(entry => entry.id));
  const added = entries.filter(entry => !ids.has(entry.id));
  if (!added.length) return state;
  for (const entry of added) {
    if (!entry.historyOnly || !["purchase","income"].includes(entry.kind ?? "purchase") || !Number.isFinite(entry.amount) || entry.amount < 0.01 || entry.amount > 1e12
      || !Number.isFinite(Date.parse(entry.createdAt)) || entry.balanceBefore !== undefined || entry.balanceAfter !== undefined || entry.savingsAllocated !== undefined || (entry.note?.length ?? 0) > 120) throw new Error("Check the imported activity.");
    if (ids.has(entry.id)) throw new Error("Duplicate CSV activity.");
    ids.add(entry.id);
  }
  const purchases = [...state.purchases, ...added];
  if (JSON.stringify(purchases).length > 700000) throw new Error("Your history is too large for this import. Choose a smaller file.");
  // Financial ledger order stays intact; the Activity screen sorts the dated display.
  return { ...state, purchases };
}
