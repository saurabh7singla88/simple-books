import { db } from '../db/client';
import { invoices, invoiceLines, contacts } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export type InvoiceLineInput = {
  description: string; quantity: number; rate: number; taxRate: number; accountId?: string | null;
};

export function calcInvoiceTotals(lines: InvoiceLineInput[]) {
  let subtotal = 0, taxAmount = 0;
  const computed = lines.map((l, i) => {
    const amount = l.quantity * l.rate;
    const tax = amount * (l.taxRate / 100);
    subtotal += amount; taxAmount += tax;
    return { description: l.description, quantity: l.quantity, rate: l.rate, taxRate: l.taxRate, amount, sortOrder: i, accountId: l.accountId ?? null };
  });
  return { computed, subtotal, taxAmount, total: subtotal + taxAmount };
}

export async function getNextInvoiceNumber(): Promise<string> {
  const last = await db.select({ n: invoices.invoiceNumber }).from(invoices).orderBy(desc(invoices.invoiceNumber)).limit(1).all();
  if (!last.length) return 'INV-0001';
  const match = last[0].n.match(/INV-(\d+)/);
  return match ? `INV-${String(Number(match[1]) + 1).padStart(4, '0')}` : 'INV-0001';
}

export async function getAllInvoices() {
  return db.select({
    id: invoices.id, invoiceNumber: invoices.invoiceNumber, date: invoices.date,
    dueDate: invoices.dueDate, contactId: invoices.contactId, contactName: contacts.name,
    status: invoices.status, subtotal: invoices.subtotal, taxAmount: invoices.taxAmount,
    total: invoices.total, createdAt: invoices.createdAt,
  }).from(invoices).leftJoin(contacts, eq(invoices.contactId, contacts.id)).orderBy(desc(invoices.date)).all();
}

export async function getInvoiceById(id: string) {
  const invoice = await db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!invoice) return null;
  const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, id)).orderBy(invoiceLines.sortOrder).all();
  const contact = await db.select().from(contacts).where(eq(contacts.id, invoice.contactId)).get();
  return { ...invoice, lines, contact };
}

export async function getInvoiceRaw(id: string) {
  return db.select().from(invoices).where(eq(invoices.id, id)).get() ?? null;
}

export async function createInvoice(data: {
  contactId: string; date: string; dueDate: string; notes?: string; lines: InvoiceLineInput[];
}) {
  const { computed, subtotal, taxAmount, total } = calcInvoiceTotals(data.lines);
  const now = new Date().toISOString();
  const id = randomUUID();
  const invoiceNumber = await getNextInvoiceNumber();
  await db.insert(invoices).values({ id, invoiceNumber, date: data.date, dueDate: data.dueDate, contactId: data.contactId, notes: data.notes ?? null, subtotal, taxAmount, total, status: 'DRAFT', createdAt: now, updatedAt: now });
  for (const line of computed) {
    await db.insert(invoiceLines).values({ id: randomUUID(), invoiceId: id, ...line });
  }
  return { id, invoiceNumber };
}

export async function updateInvoice(id: string, data: {
  contactId: string; date: string; dueDate: string; notes?: string; lines: InvoiceLineInput[];
}) {
  const { computed, subtotal, taxAmount, total } = calcInvoiceTotals(data.lines);
  const now = new Date().toISOString();
  await db.update(invoices).set({ contactId: data.contactId, date: data.date, dueDate: data.dueDate, notes: data.notes ?? null, subtotal, taxAmount, total, updatedAt: now }).where(eq(invoices.id, id));
  await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, id));
  for (const line of computed) {
    await db.insert(invoiceLines).values({ id: randomUUID(), invoiceId: id, ...line });
  }
}

export async function updateInvoiceStatus(id: string, status: 'DRAFT' | 'SENT' | 'PAID' | 'VOID') {
  await db.update(invoices).set({ status, updatedAt: new Date().toISOString() }).where(eq(invoices.id, id));
}
