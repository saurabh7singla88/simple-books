import { db } from '../db/client';
import { chartAccounts } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function getAllAccounts() {
  return db.select().from(chartAccounts).orderBy(asc(chartAccounts.code)).all();
}

export async function getAccountById(id: string) {
  return db.select().from(chartAccounts).where(eq(chartAccounts.id, id)).get() ?? null;
}

export async function getAccountByCode(code: string) {
  return db.select().from(chartAccounts).where(eq(chartAccounts.code, code)).get() ?? null;
}

export async function createAccount(data: {
  code: string; name: string; type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  description?: string; parentId?: string;
}) {
  const now = new Date().toISOString();
  const account = {
    id: randomUUID(), code: data.code, name: data.name, type: data.type,
    description: data.description ?? null, parentId: data.parentId ?? null,
    isActive: true, createdAt: now, updatedAt: now,
  };
  await db.insert(chartAccounts).values(account);
  return account;
}

export async function updateAccount(id: string, data: Partial<{
  code: string; name: string; type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  description: string; parentId: string;
}>) {
  await db.update(chartAccounts)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(chartAccounts.id, id));
}

export async function deactivateAccount(id: string) {
  await db.update(chartAccounts)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(chartAccounts.id, id));
}
