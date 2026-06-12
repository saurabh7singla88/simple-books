import { db } from '../db/client';
import { recurringExpenses, bills, billLines, contacts, chartAccounts } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getNextBillNumber } from './bill.service';

function advanceDate(date: string, frequency: string): string {
  const d = new Date(date);
  switch (frequency) {
    case 'DAILY':   d.setDate(d.getDate() + 1); break;
    case 'WEEKLY':  d.setDate(d.getDate() + 7); break;
    case 'MONTHLY': d.setMonth(d.getMonth() + 1); break;
    case 'YEARLY':  d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
}

export async function getAllRecurringExpenses() {
  return db.select({
    id: recurringExpenses.id, name: recurringExpenses.name,
    contactId: recurringExpenses.contactId, contactName: contacts.name,
    accountId: recurringExpenses.accountId, accountName: chartAccounts.name,
    description: recurringExpenses.description,
    amount: recurringExpenses.amount, taxRate: recurringExpenses.taxRate,
    frequency: recurringExpenses.frequency,
    startDate: recurringExpenses.startDate, endDate: recurringExpenses.endDate,
    nextDate: recurringExpenses.nextDate, isActive: recurringExpenses.isActive,
    notes: recurringExpenses.notes, createdAt: recurringExpenses.createdAt,
  })
    .from(recurringExpenses)
    .leftJoin(contacts, eq(recurringExpenses.contactId, contacts.id))
    .leftJoin(chartAccounts, eq(recurringExpenses.accountId, chartAccounts.id))
    .orderBy(desc(recurringExpenses.createdAt))
    .all();
}

export async function getRecurringExpenseById(id: string) {
  return db.select().from(recurringExpenses).where(eq(recurringExpenses.id, id)).get() ?? null;
}

export type RecurringExpenseInput = {
  name: string; contactId?: string; accountId: string; description: string;
  amount: number; taxRate: number; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string; endDate?: string; nextDate: string; notes?: string;
};

export async function createRecurringExpense(data: RecurringExpenseInput) {
  const now = new Date().toISOString();
  const id = randomUUID();
  await db.insert(recurringExpenses).values({
    id, name: data.name, contactId: data.contactId ?? null,
    accountId: data.accountId, description: data.description,
    amount: data.amount, taxRate: data.taxRate, frequency: data.frequency,
    startDate: data.startDate, endDate: data.endDate ?? null, nextDate: data.nextDate,
    isActive: true, notes: data.notes ?? null, createdAt: now, updatedAt: now,
  });
  return id;
}

export async function updateRecurringExpense(id: string, data: Partial<RecurringExpenseInput>) {
  await db.update(recurringExpenses)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(recurringExpenses.id, id));
}

export async function toggleRecurringExpense(id: string) {
  const row = await db.select().from(recurringExpenses).where(eq(recurringExpenses.id, id)).get();
  if (!row) return null;
  const newState = !row.isActive;
  await db.update(recurringExpenses)
    .set({ isActive: newState, updatedAt: new Date().toISOString() })
    .where(eq(recurringExpenses.id, id));
  return newState;
}

export async function generateBillFromRecurring(id: string) {
  const row = await db.select().from(recurringExpenses).where(eq(recurringExpenses.id, id)).get();
  if (!row) return null;

  const now = new Date().toISOString();
  const billDate = row.nextDate;
  const dueDate = advanceDate(billDate, row.frequency);
  const amount = row.amount;
  const taxAmount = amount * (row.taxRate / 100);
  const total = amount + taxAmount;
  const billNumber = await getNextBillNumber();
  const billId = randomUUID();

  await db.insert(bills).values({
    id: billId, billNumber, date: billDate, dueDate,
    contactId: row.contactId ?? 'RECURRING',
    notes: row.notes ?? null, subtotal: amount, taxAmount, total, status: 'DRAFT',
    attachmentName: null, attachmentPath: null, createdAt: now, updatedAt: now,
  });
  await db.insert(billLines).values({
    id: randomUUID(), billId, accountId: row.accountId,
    description: row.description, quantity: 1, rate: amount, taxRate: row.taxRate, amount, sortOrder: 0,
  });

  const newNextDate = advanceDate(row.nextDate, row.frequency);
  const shouldDeactivate = row.endDate && newNextDate > row.endDate;
  await db.update(recurringExpenses)
    .set({ nextDate: newNextDate, isActive: shouldDeactivate ? false : row.isActive, updatedAt: now })
    .where(eq(recurringExpenses.id, id));

  return { billId, billNumber };
}

export async function deleteRecurringExpense(id: string) {
  await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id));
}
