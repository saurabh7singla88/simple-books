export type Role = 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type ContactType = 'CUSTOMER' | 'VENDOR' | 'BOTH';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'VOID';
export type BillStatus = 'DRAFT' | 'RECEIVED' | 'PAID' | 'VOID';
export type JournalStatus = 'DRAFT' | 'POSTED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  description?: string | null;
  parentId?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Contact {
  id: string;
  type: ContactType;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
  pan?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface LineItem {
  id?: string;
  accountId?: string | null;
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
  amount?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  contactId: string;
  contactName?: string | null;
  status: InvoiceStatus;
  notes?: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  lines?: LineItem[];
  createdAt: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  date: string;
  dueDate: string;
  contactId: string;
  contactName?: string | null;
  status: BillStatus;
  notes?: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  lines?: LineItem[];
  attachmentName?: string | null;
  createdAt: string;
}

export interface JournalLine {
  id?: string;
  accountId: string;
  accountCode?: string | null;
  accountName?: string | null;
  description?: string | null;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  reference?: string | null;
  status: JournalStatus;
  lines?: JournalLine[];
  createdAt: string;
}

export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurringExpense {
  id: string;
  name: string;
  contactId?: string | null;
  contactName?: string | null;
  accountId: string;
  accountName?: string | null;
  description: string;
  amount: number;
  taxRate: number;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string | null;
  nextDate: string;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
}

