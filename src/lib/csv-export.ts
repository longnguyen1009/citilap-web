/**
 * Secure CSV Export Helper for CitiLap Admin
 * Prevents CSV Formula Injection (CWE-1236)
 * Supports UTF-8 BOM (\ufeff) for Vietnamese characters in Microsoft Excel
 */

/**
 * Escapes a cell value for CSV output:
 * - Wraps in double quotes
 * - Escapes double quotes with ""
 * - Neutralizes formula injection characters (=, +, -, @, \t, \r) by prepending a single quote (')
 */
export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = String(val);

  // If the cell begins with dangerous formula injection characters, prefix with single quote (')
  // This prevents spreadsheet software (Excel, LibreOffice, Google Sheets) from executing formulas.
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousPrefixes.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  // Escape internal double quotes by doubling them
  const escaped = str.replaceAll('"', '""');
  return `"${escaped}"`;
}

/**
 * Builds a complete CSV file string from headers and rows with UTF-8 BOM.
 */
export function buildCsvContent(headers: string[], rows: (unknown[])[]): string {
  const headerLine = headers.map(escapeCsvField).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvField).join(','));
  // Prepend UTF-8 Byte Order Mark (\ufeff) so Excel auto-detects UTF-8 Vietnamese encoding
  return '\ufeff' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Creates a standard Response with CSV download headers and no-store caching.
 * Supports either:
 * 1. createCsvResponse(headers: string[], rows: unknown[][], filename: string)
 * 2. createCsvResponse(csvContent: string, filename: string)
 */
export function createCsvResponse(
  headersOrContent: string[] | string,
  rowsOrFilename: (unknown[])[] | string,
  maybeFilename?: string
): Response {
  let content: string;
  let filename: string;

  if (Array.isArray(headersOrContent)) {
    content = buildCsvContent(headersOrContent, Array.isArray(rowsOrFilename) ? rowsOrFilename : []);
    filename = maybeFilename || 'export.csv';
  } else {
    content = headersOrContent;
    filename = typeof rowsOrFilename === 'string' ? rowsOrFilename : 'export.csv';
  }

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
