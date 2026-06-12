import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { libsqlClient, db } from './client';
import { users, chartAccounts } from './schema';

type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

const DEFAULT_COA: Array<{ code: string; name: string; type: AccountType; description: string }> = [
  { code: '1000', name: 'Cash', type: 'ASSET', description: 'Cash on hand' },
  { code: '1010', name: 'Bank Account', type: 'ASSET', description: 'Primary bank account' },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET', description: 'Money owed by customers' },
  { code: '1200', name: 'Inventory', type: 'ASSET', description: 'Goods held for sale' },
  { code: '1500', name: 'Fixed Assets', type: 'ASSET', description: 'Property and equipment' },
  { code: '1510', name: 'Accumulated Depreciation', type: 'ASSET', description: 'Accumulated depreciation' },
  { code: '1600', name: 'Input Tax Credit', type: 'ASSET', description: 'GST paid on purchases' },
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', description: 'Money owed to vendors' },
  { code: '2100', name: 'GST Payable', type: 'LIABILITY', description: 'GST collected from customers' },
  { code: '2500', name: 'Loans Payable', type: 'LIABILITY', description: 'Bank loans and borrowings' },
  { code: '3000', name: "Owner's Equity", type: 'EQUITY', description: "Owner's capital" },
  { code: '3100', name: 'Retained Earnings', type: 'EQUITY', description: 'Accumulated profits' },
  { code: '4000', name: 'Sales Revenue', type: 'REVENUE', description: 'Revenue from product sales' },
  { code: '4100', name: 'Service Revenue', type: 'REVENUE', description: 'Revenue from services' },
  { code: '4900', name: 'Other Income', type: 'REVENUE', description: 'Miscellaneous income' },
  { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', description: 'Direct cost of products sold' },
  { code: '6000', name: 'Salaries & Wages', type: 'EXPENSE', description: 'Employee salaries and wages' },
  { code: '6100', name: 'Rent', type: 'EXPENSE', description: 'Office or warehouse rent' },
  { code: '6200', name: 'Utilities', type: 'EXPENSE', description: 'Electricity, water, internet' },
  { code: '6300', name: 'Office Supplies', type: 'EXPENSE', description: 'Stationery and office materials' },
  { code: '6400', name: 'Marketing & Advertising', type: 'EXPENSE', description: 'Advertising and promotions' },
  { code: '6500', name: 'Depreciation', type: 'EXPENSE', description: 'Depreciation on fixed assets' },
  { code: '6600', name: 'Bank Charges', type: 'EXPENSE', description: 'Bank fees and charges' },
  { code: '6900', name: 'Other Expenses', type: 'EXPENSE', description: 'Miscellaneous expenses' },
];

export async function runMigrations(): Promise<void> {
  await libsqlClient.execute(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'VIEWER' CHECK(role IN ('ADMIN','ACCOUNTANT','VIEWER')),
    is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`);

  await libsqlClient.execute(`CREATE TABLE IF NOT EXISTS chart_accounts (
    id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
    description TEXT, parent_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`);

  await libsqlClient.execute(`CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('CUSTOMER','VENDOR','BOTH')),
    name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, gstin TEXT, pan TEXT, notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`);

  await libsqlClient.execute(`CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY, invoice_number TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL, due_date TEXT NOT NULL, contact_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SENT','PAID','VOID')),
    notes TEXT, subtotal REAL NOT NULL DEFAULT 0, tax_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id)
  )`);

  await libsqlClient.execute(`CREATE TABLE IF NOT EXISTS invoice_lines (
    id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL, description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1, rate REAL NOT NULL DEFAULT 0,
    tax_rate REAL NOT NULL DEFAULT 0, amount REAL NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  )`);

  await libsqlClient.execute(`CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY, bill_number TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL, due_date TEXT NOT NULL, contact_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','RECEIVED','PAID','VOID')),
    notes TEXT, subtotal REAL NOT NULL DEFAULT 0, tax_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id)
  )`);

  await libsqlClient.execute(`CREATE TABLE IF NOT EXISTS bill_lines (
    id TEXT PRIMARY KEY, bill_id TEXT NOT NULL, description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1, rate REAL NOT NULL DEFAULT 0,
    tax_rate REAL NOT NULL DEFAULT 0, amount REAL NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
  )`);

  await libsqlClient.execute(`CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY, entry_number TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL, description TEXT NOT NULL, reference TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','POSTED')),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`);

  await libsqlClient.execute(`CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id TEXT PRIMARY KEY, journal_entry_id TEXT NOT NULL, account_id TEXT NOT NULL,
    description TEXT, debit REAL NOT NULL DEFAULT 0, credit REAL NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES chart_accounts(id)
  )`);

  // Add accountId columns if they don't exist yet (idempotent)
  try { await libsqlClient.execute(`ALTER TABLE invoice_lines ADD COLUMN account_id TEXT`); } catch (_) { /* already exists */ }
  try { await libsqlClient.execute(`ALTER TABLE bill_lines ADD COLUMN account_id TEXT`); } catch (_) { /* already exists */ }
  try { await libsqlClient.execute(`ALTER TABLE bills ADD COLUMN attachment_name TEXT`); } catch (_) { /* already exists */ }
  try { await libsqlClient.execute(`ALTER TABLE bills ADD COLUMN attachment_path TEXT`); } catch (_) { /* already exists */ }

  await libsqlClient.execute(`CREATE TABLE IF NOT EXISTS recurring_expenses (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, contact_id TEXT, account_id TEXT NOT NULL,
    description TEXT NOT NULL, amount REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0,
    frequency TEXT NOT NULL DEFAULT 'MONTHLY' CHECK(frequency IN ('DAILY','WEEKLY','MONTHLY','YEARLY')),
    start_date TEXT NOT NULL, end_date TEXT, next_date TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1, notes TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id),
    FOREIGN KEY (account_id) REFERENCES chart_accounts(id)
  )`);

  // Seed admin
  const usersRow = await libsqlClient.execute('SELECT COUNT(*) as cnt FROM users');
  if (Number(usersRow.rows[0].cnt) === 0) {
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash('admin123', 12);
    await db.insert(users).values({ id: randomUUID(), email: 'admin@accounts.local', name: 'Admin User', passwordHash, role: 'ADMIN', isActive: true, createdAt: now, updatedAt: now });
    console.log('\n  Default admin created:\n  Email:    admin@accounts.local\n  Password: admin123\n');
  }

  // Seed chart of accounts
  const coaRow = await libsqlClient.execute('SELECT COUNT(*) as cnt FROM chart_accounts');
  if (Number(coaRow.rows[0].cnt) === 0) {
    const now = new Date().toISOString();
    for (const a of DEFAULT_COA) {
      await db.insert(chartAccounts).values({ id: randomUUID(), code: a.code, name: a.name, type: a.type, description: a.description, isActive: true, createdAt: now, updatedAt: now });
    }
    console.log(`  Seeded ${DEFAULT_COA.length} chart of accounts entries`);
  }

  console.log('Database ready');
}
