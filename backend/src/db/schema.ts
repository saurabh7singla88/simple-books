import { text, integer, real, sqliteTable } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['ADMIN', 'ACCOUNTANT', 'VIEWER'] }).notNull().default('VIEWER'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const chartAccounts = sqliteTable('chart_accounts', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type', { enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] }).notNull(),
  description: text('description'),
  parentId: text('parent_id'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['CUSTOMER', 'VENDOR', 'BOTH'] }).notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  gstin: text('gstin'),
  pan: text('pan'),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  date: text('date').notNull(),
  dueDate: text('due_date').notNull(),
  contactId: text('contact_id').notNull(),
  status: text('status', { enum: ['DRAFT', 'SENT', 'PAID', 'VOID'] }).notNull().default('DRAFT'),
  notes: text('notes'),
  subtotal: real('subtotal').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  total: real('total').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const invoiceLines = sqliteTable('invoice_lines', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull(),
  accountId: text('account_id'),
  description: text('description').notNull(),
  quantity: real('quantity').notNull().default(1),
  rate: real('rate').notNull().default(0),
  taxRate: real('tax_rate').notNull().default(0),
  amount: real('amount').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const bills = sqliteTable('bills', {
  id: text('id').primaryKey(),
  billNumber: text('bill_number').notNull().unique(),
  date: text('date').notNull(),
  dueDate: text('due_date').notNull(),
  contactId: text('contact_id').notNull(),
  status: text('status', { enum: ['DRAFT', 'RECEIVED', 'PAID', 'VOID'] }).notNull().default('DRAFT'),
  notes: text('notes'),
  subtotal: real('subtotal').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  total: real('total').notNull().default(0),
  attachmentName: text('attachment_name'),
  attachmentPath: text('attachment_path'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const billLines = sqliteTable('bill_lines', {
  id: text('id').primaryKey(),
  billId: text('bill_id').notNull(),
  accountId: text('account_id'),
  description: text('description').notNull(),
  quantity: real('quantity').notNull().default(1),
  rate: real('rate').notNull().default(0),
  taxRate: real('tax_rate').notNull().default(0),
  amount: real('amount').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey(),
  entryNumber: text('entry_number').notNull().unique(),
  date: text('date').notNull(),
  description: text('description').notNull(),
  reference: text('reference'),
  status: text('status', { enum: ['DRAFT', 'POSTED'] }).notNull().default('DRAFT'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const journalEntryLines = sqliteTable('journal_entry_lines', {
  id: text('id').primaryKey(),
  journalEntryId: text('journal_entry_id').notNull(),
  accountId: text('account_id').notNull(),
  description: text('description'),
  debit: real('debit').notNull().default(0),
  credit: real('credit').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
});

export type User = typeof users.$inferSelect;
export type ChartAccount = typeof chartAccounts.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type BillLine = typeof billLines.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Role = 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';

export const recurringExpenses = sqliteTable('recurring_expenses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contactId: text('contact_id'),
  accountId: text('account_id').notNull(),
  description: text('description').notNull(),
  amount: real('amount').notNull().default(0),
  taxRate: real('tax_rate').notNull().default(0),
  frequency: text('frequency', { enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] }).notNull().default('MONTHLY'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  nextDate: text('next_date').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type RecurringExpense = typeof recurringExpenses.$inferSelect;
