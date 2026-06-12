import { db } from '../db/client';
import { journalEntries, journalEntryLines, chartAccounts } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export type JournalLineInput = {
  accountId: string; description?: string; debit: number; credit: number;
};

export async function getNextEntryNumber(): Promise<string> {
  const last = await db.select({ n: journalEntries.entryNumber }).from(journalEntries).orderBy(desc(journalEntries.entryNumber)).limit(1).all();
  if (!last.length) return 'JE-0001';
  const match = last[0].n.match(/JE-(\d+)/);
  return match ? `JE-${String(Number(match[1]) + 1).padStart(4, '0')}` : 'JE-0001';
}

export async function getAllJournalEntries() {
  return db.select().from(journalEntries).orderBy(desc(journalEntries.date)).all();
}

export async function getJournalEntryById(id: string) {
  const entry = await db.select().from(journalEntries).where(eq(journalEntries.id, id)).get();
  if (!entry) return null;
  const lines = await db.select({
    id: journalEntryLines.id,
    accountId: journalEntryLines.accountId,
    accountCode: chartAccounts.code,
    accountName: chartAccounts.name,
    description: journalEntryLines.description,
    debit: journalEntryLines.debit,
    credit: journalEntryLines.credit,
    sortOrder: journalEntryLines.sortOrder,
  }).from(journalEntryLines)
    .leftJoin(chartAccounts, eq(journalEntryLines.accountId, chartAccounts.id))
    .where(eq(journalEntryLines.journalEntryId, id))
    .orderBy(journalEntryLines.sortOrder)
    .all();
  return { ...entry, lines };
}

export async function getJournalEntryRaw(id: string) {
  return db.select().from(journalEntries).where(eq(journalEntries.id, id)).get() ?? null;
}

export async function createJournalEntry(data: {
  date: string; description: string; reference?: string; lines: JournalLineInput[];
}) {
  const now = new Date().toISOString();
  const id = randomUUID();
  const entryNumber = await getNextEntryNumber();
  await db.insert(journalEntries).values({ id, entryNumber, date: data.date, description: data.description, reference: data.reference ?? null, status: 'DRAFT', createdAt: now, updatedAt: now });
  for (let i = 0; i < data.lines.length; i++) {
    const l = data.lines[i];
    await db.insert(journalEntryLines).values({ id: randomUUID(), journalEntryId: id, accountId: l.accountId, description: l.description ?? null, debit: l.debit, credit: l.credit, sortOrder: i });
  }
  return { id, entryNumber };
}

export async function updateJournalEntry(id: string, data: {
  date: string; description: string; reference?: string; lines: JournalLineInput[];
}) {
  const now = new Date().toISOString();
  await db.update(journalEntries).set({ date: data.date, description: data.description, reference: data.reference ?? null, updatedAt: now }).where(eq(journalEntries.id, id));
  await db.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, id));
  for (let i = 0; i < data.lines.length; i++) {
    const l = data.lines[i];
    await db.insert(journalEntryLines).values({ id: randomUUID(), journalEntryId: id, accountId: l.accountId, description: l.description ?? null, debit: l.debit, credit: l.credit, sortOrder: i });
  }
}

export async function postJournalEntry(id: string) {
  await db.update(journalEntries).set({ status: 'POSTED', updatedAt: new Date().toISOString() }).where(eq(journalEntries.id, id));
}

export async function deleteJournalEntry(id: string) {
  await db.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, id));
  await db.delete(journalEntries).where(eq(journalEntries.id, id));
}
