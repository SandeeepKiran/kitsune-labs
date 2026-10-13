// Export helpers: everything is built in the browser and saved with a temporary link.
// Excel (.xlsx) and .zip exports arrive in M3 with SheetJS and JSZip (approved in D4).

export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(fileName: string, text: string, mime = 'text/plain'): void {
  downloadBlob(fileName, new Blob([text], { type: `${mime};charset=utf-8` }));
}

export function downloadJson(fileName: string, value: unknown): void {
  downloadText(fileName, `${JSON.stringify(value, null, 2)}\n`, 'application/json');
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[], columns = Object.keys(rows[0] ?? {})): string {
  return [columns.map(csvCell).join(','), ...rows.map((row) => columns.map((c) => csvCell(row[c])).join(','))]
    .join('\r\n') + '\r\n';
}

export function downloadCsv(fileName: string, rows: Record<string, unknown>[], columns?: string[]): void {
  downloadText(fileName, toCsv(rows, columns), 'text/csv');
}

/** "mousy/refund_chat.txt" -> "refund_chat" (for naming exports after their source). */
export function baseName(fileName: string): string {
  return (fileName.split(/[\\/]/).pop() ?? fileName).replace(/\.[^.]+$/, '') || 'export';
}
