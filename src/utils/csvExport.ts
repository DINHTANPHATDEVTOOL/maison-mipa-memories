/**
 * CSV Export utility with formula injection neutralization.
 * Safely exports arrays of objects to CSV.
 */

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

/**
 * Neutralizes potential CSV formula injection.
 * Any string value beginning with =, +, -, or @ is prefixed with a single quote (').
 */
export function sanitizeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Check for dangerous formula starters
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }

  return str;
}

/**
 * Formats a single CSV cell, escaping quotes and wrapping in quotes if needed.
 */
export function formatCsvCell(value: unknown): string {
  const sanitized = sanitizeCsvValue(value);
  // If the cell contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (sanitized.includes('"') || sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('\r')) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

/**
 * Converts data rows to CSV string using specified columns.
 */
export function generateCsv<T>(data: T[], columns: CsvColumn<T>[]): string {
  const headerRow = columns.map(c => formatCsvCell(c.header)).join(',');
  const rows = data.map(row =>
    columns.map(col => formatCsvCell(col.accessor(row))).join(',')
  );

  return [headerRow, ...rows].join('\r\n');
}

/**
 * Triggers a browser download of the CSV content.
 */
export function downloadCsv(filename: string, csvContent: string): void {
  // Use UTF-8 BOM so Excel opens Vietnamese characters correctly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
