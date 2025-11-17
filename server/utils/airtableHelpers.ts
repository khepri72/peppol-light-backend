/**
 * Safely escape a string value for use in Airtable filterByFormula
 * Prevents formula injection attacks by properly escaping quotes
 * Airtable uses doubled single quotes ('') to escape single quotes in string literals
 */
export function escapeAirtableValue(value: string): string {
  // Replace single quotes with doubled single quotes
  // In Airtable formulas, '' represents a literal single quote within a string
  return value.replace(/'/g, "''");
}

/**
 * Build a safe Airtable filter formula for exact field matching
 * @param fieldName - The Airtable field name (e.g., 'email')
 * @param value - The value to match
 * @returns A safe filterByFormula string
 */
export function buildSafeFilterFormula(fieldName: string, value: string): string {
  const escapedValue = escapeAirtableValue(value);
  return `{${fieldName}} = '${escapedValue}'`;
}
