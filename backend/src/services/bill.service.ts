import { db } from '../db/client';
import { bills, billLines, contacts } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export type BillLineInput = {
  description: string; quantity: number; rate: number; taxRate: number; accountId?: string | null;
};

export function calcBillTotals(lines: BillLineInput[]) {
  let subtotal = 0, taxAmount = 0;
  const computed = lines.map((l, i) => {
    const amount = l.quantity * l.rate;
    const tax = amount * (l.taxRate / 100);
    subtotal += amount; taxAmount += tax;
    return { description: l.description, quantity: l.quantity, rate: l.rate, taxRate: l.taxRate, amount, sortOrder: i, accountId: l.accountId ?? null };
  });
  return { computed, subtotal, taxAmount, total: subtotal + taxAmount };
}

export async function getNextBillNumber(): Promise<string> {
  const last = await db.select({ n: bills.billNumber }).from(bills).orderBy(desc(bills.billNumber)).limit(1).all();
  if (!last.length) return 'BILL-0001';
  const match = last[0].n.match(/BILL-(\d+)/);
  return match ? `BILL-${String(Number(match[1]) + 1).padStart(4, '0')}` : 'BILL-0001';
}

export async function getAllBills() {
  return db.select({
    id: bills.id, billNumber: bills.billNumber, date: bills.date,
    dueDate: bills.dueDate, contactId: bills.contactId, contactName: contacts.name,
    status: bills.status, subtotal: bills.subtotal, taxAmount: bills.taxAmount,
    total: bills.total, createdAt: bills.createdAt,
  }).from(bills).leftJoin(contacts, eq(bills.contactId, contacts.id)).orderBy(desc(bills.date)).all();
}

export async function getBillById(id: string) {
  const bill = await db.select().from(bills).where(eq(bills.id, id)).get();
  if (!bill) return null;
  const lines = await db.select().from(billLines).where(eq(billLines.billId, id)).orderBy(billLines.sortOrder).all();
  const contact = await db.select().from(contacts).where(eq(contacts.id, bill.contactId)).get();
  return { ...bill, lines, contact };
}

export async function getBillRaw(id: string) {
  return db.select().from(bills).where(eq(bills.id, id)).get() ?? null;
}

export async function createBill(data: {
  contactId: string; date: string; dueDate: string; notes?: string; lines: BillLineInput[];
}) {
  const { computed, subtotal, taxAmount, total } = calcBillTotals(data.lines);
  const now = new Date().toISOString();
  const id = randomUUID();
  const billNumber = await getNextBillNumber();
  await db.insert(bills).values({ id, billNumber, date: data.date, dueDate: data.dueDate, contactId: data.contactId, notes: data.notes ?? null, subtotal, taxAmount, total, status: 'DRAFT', attachmentName: null, attachmentPath: null, createdAt: now, updatedAt: now });
  for (const line of computed) {
    await db.insert(billLines).values({ id: randomUUID(), billId: id, ...line });
  }
  return { id, billNumber };
}

export async function updateBill(id: string, data: {
  contactId: string; date: string; dueDate: string; notes?: string; lines: BillLineInput[];
}) {
  const { computed, subtotal, taxAmount, total } = calcBillTotals(data.lines);
  const now = new Date().toISOString();
  await db.update(bills).set({ contactId: data.contactId, date: data.date, dueDate: data.dueDate, notes: data.notes ?? null, subtotal, taxAmount, total, updatedAt: now }).where(eq(bills.id, id));
  await db.delete(billLines).where(eq(billLines.billId, id));
  for (const line of computed) {
    await db.insert(billLines).values({ id: randomUUID(), billId: id, ...line });
  }
}

export async function updateBillStatus(id: string, status: 'DRAFT' | 'RECEIVED' | 'PAID' | 'VOID') {
  await db.update(bills).set({ status, updatedAt: new Date().toISOString() }).where(eq(bills.id, id));
}

export async function saveBillAttachment(id: string, originalName: string, filePath: string) {
  await db.update(bills).set({ attachmentName: originalName, attachmentPath: filePath, updatedAt: new Date().toISOString() }).where(eq(bills.id, id));
}

export async function clearBillAttachment(id: string) {
  await db.update(bills).set({ attachmentName: null, attachmentPath: null, updatedAt: new Date().toISOString() }).where(eq(bills.id, id));
}
