import { describe, it, expect } from 'vitest';
import { sanitizeCsvValue, formatCsvCell, generateCsv } from '../csvExport';

describe('CSV Export Utility & Formula Injection Neutralization', () => {
  it('neutralizes formula injection characters (=, +, -, @)', () => {
    expect(sanitizeCsvValue('=cmd|"/C calc"!A0')).toBe('\'=cmd|"/C calc"!A0');
    expect(sanitizeCsvValue('+12345')).toBe('\'+12345');
    expect(sanitizeCsvValue('-SUM(A1:A10)')).toBe('\'-SUM(A1:A10)');
    expect(sanitizeCsvValue('@SUM(A1:A10)')).toBe('\'@SUM(A1:A10)');
  });

  it('preserves normal strings and numbers without leading formula characters', () => {
    expect(sanitizeCsvValue('Nguyễn Văn A')).toBe('Nguyễn Văn A');
    expect(sanitizeCsvValue('0987654321')).toBe('0987654321');
    expect(sanitizeCsvValue(1500000)).toBe('1500000');
    expect(sanitizeCsvValue(null)).toBe('');
    expect(sanitizeCsvValue(undefined)).toBe('');
  });

  it('escapes quotes, commas, and newlines in formatCsvCell', () => {
    expect(formatCsvCell('Hello, World')).toBe('"Hello, World"');
    expect(formatCsvCell('He said "Hello"')).toBe('"He said ""Hello"""');
    expect(formatCsvCell('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
  });

  it('generates well-formatted CSV with headers and rows', () => {
    const data = [
      { name: 'Nguyễn Văn A', phone: '0901234567', total: 5000000 },
      { name: '=DangerousFormula', phone: '+84901234567', total: 3000000 },
    ];

    const columns = [
      { header: 'Họ Tên', accessor: (d: any) => d.name },
      { header: 'Số Điện Thoại', accessor: (d: any) => d.phone },
      { header: 'Doanh Thu', accessor: (d: any) => d.total },
    ];

    const csv = generateCsv(data, columns);
    const lines = csv.split('\r\n');

    expect(lines[0]).toBe('Họ Tên,Số Điện Thoại,Doanh Thu');
    expect(lines[1]).toBe('Nguyễn Văn A,0901234567,5000000');
    // Check neutralization of dangerous formula in row 2
    expect(lines[2]).toBe('\'=DangerousFormula,\'+84901234567,3000000');
  });
});
