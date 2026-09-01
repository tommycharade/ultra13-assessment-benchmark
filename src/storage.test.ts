import { describe, expect, it } from 'vitest';
import { escapeCsvCell } from './storage';

describe('CSV export hardening', () => {
  it('neutralizes spreadsheet formulas from imported evidence fields', () => {
    expect(escapeCsvCell('=HYPERLINK("https://example.invalid")')).toBe(`"'=HYPERLINK(""https://example.invalid"")"`);
    expect(escapeCsvCell('+SUM(1,2)')).toBe("\"'+SUM(1,2)\"");
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
  });

  it('escapes ordinary commas and quotes without altering plain text', () => {
    expect(escapeCsvCell('owner/repository')).toBe('owner/repository');
    expect(escapeCsvCell('one, "two"')).toBe('"one, ""two"""');
  });
});
