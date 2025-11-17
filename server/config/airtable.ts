import Airtable from 'airtable';

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in environment variables');
}

Airtable.configure({
  apiKey: apiKey,
});

export const base = Airtable.base(baseId);

// Table names
export const TABLES = {
  USERS: 'Users',
  INVOICES: 'Invoices',
};
