// Reading and writing Excel (.xlsx) and .zip files, all in the browser.
// SheetJS and JSZip are loaded only when a tool needs them, so plain pages stay small.
import { csvRecords } from './csv.ts';
import { downloadBlob } from './export.ts';

export type Row = Record<string, string>;

export interface Table {
  columns: string[];
  rows: Row[];
  sheet?: string;
}

export interface TextFile {
  name: string;
  text: string;
}

// Limits keep a hostile or huge file from freezing the tab.
const MAX_ZIP_FILES = 500;
const MAX_ZIP_TEXT = 20 * 1024 * 1024;
const TEXT_IN_ZIP = /\.(txt|json|ya?ml|csv)$/i;

const loadSheetJs = () => import('xlsx');
const loadJsZip = async () => (await import('jszip')).default;

function columnsOf(rows: Row[]): string[] {
  const columns: string[] = [];
  for (const row of rows) for (const name of Object.keys(row)) if (!columns.includes(name)) columns.push(name);
  return columns;
}

export function tableFromCsv(text: string): Table {
  const rows = csvRecords(text);
  return { columns: columnsOf(rows), rows };
}

/** First sheet of a workbook as rows of text. Every cell comes back as a string. */
export async function readWorkbook(bytes: ArrayBuffer): Promise<Table> {
  const XLSX = await loadSheetJs();
  const book = XLSX.read(bytes, { type: 'array', dense: true });
  const sheetName = book.SheetNames[0];
  if (!sheetName) return { columns: [], rows: [] };
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[sheetName], { defval: '', raw: false });
  const rows = raw.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim(), String(v ?? '')])));
  return { columns: columnsOf(rows), rows, sheet: sheetName };
}

/** Text files inside a .zip (transcripts, JSON, YAML, CSV). Folders and other files are skipped. */
export async function readZip(bytes: ArrayBuffer): Promise<{ files: TextFile[]; skipped: number }> {
  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(bytes);
  const files: TextFile[] = [];
  let skipped = 0;
  let total = 0;
  const entries = Object.values(zip.files).filter((entry) => !entry.dir).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (!TEXT_IN_ZIP.test(entry.name) || files.length >= MAX_ZIP_FILES || /(^|\/)(__MACOSX|\.)/.test(entry.name)) {
      skipped += 1;
      continue;
    }
    const text = await entry.async('string');
    total += text.length;
    if (total > MAX_ZIP_TEXT) throw new Error('The .zip holds more than 20 MB of text. Try a smaller batch.');
    files.push({ name: entry.name, text });
  }
  return { files, skipped };
}

export interface SheetSpec {
  name: string;
  rows: Record<string, unknown>[];
  columns?: string[];
}

/** Build and download an .xlsx with one or more sheets. */
export async function downloadWorkbook(fileName: string, sheets: SheetSpec[]): Promise<void> {
  const XLSX = await loadSheetJs();
  const book = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const columns = sheet.columns ?? columnsOf(sheet.rows as Row[]);
    // Excel caps a cell at 32,767 characters; cut long cells instead of failing the export.
    const rows = sheet.rows.map((row) => Object.fromEntries(columns.map((c) => {
      const value = row[c];
      return [c, typeof value === 'string' && value.length > 32000 ? `${value.slice(0, 32000)}…` : value ?? ''];
    })));
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
    worksheet['!cols'] = columns.map((c) => ({ wch: Math.min(60, Math.max(10, c.length + 2)) }));
    XLSX.utils.book_append_sheet(book, worksheet, sheet.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet1');
  }
  const data = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  downloadBlob(fileName, new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}

/** Build and download a .zip of text files. */
export async function downloadZip(fileName: string, files: TextFile[]): Promise<void> {
  const JSZip = await loadJsZip();
  const zip = new JSZip();
  for (const file of files) zip.file(file.name, file.text);
  downloadBlob(fileName, await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }));
}
