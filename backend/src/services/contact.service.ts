import { db } from '../db/client';
import { contacts } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function getAllContacts() {
  return db.select().from(contacts).where(eq(contacts.isActive, true)).orderBy(asc(contacts.name)).all();
}

export async function getContactById(id: string) {
  return db.select().from(contacts).where(eq(contacts.id, id)).get() ?? null;
}

export async function createContact(data: {
  type: 'CUSTOMER' | 'VENDOR' | 'BOTH'; name: string;
  email?: string; phone?: string; address?: string; gstin?: string; pan?: string; notes?: string;
}) {
  const now = new Date().toISOString();
  const contact = {
    id: randomUUID(), type: data.type, name: data.name,
    email: data.email || null, phone: data.phone || null, address: data.address || null,
    gstin: data.gstin || null, pan: data.pan || null, notes: data.notes || null,
    isActive: true, createdAt: now, updatedAt: now,
  };
  await db.insert(contacts).values(contact);
  return contact;
}

export async function updateContact(id: string, data: Partial<{
  type: string; name: string; email: string; phone: string;
  address: string; gstin: string; pan: string; notes: string;
}>) {
  await db.update(contacts)
    .set({ ...data, updatedAt: new Date().toISOString() } as any)
    .where(eq(contacts.id, id));
}

export async function deactivateContact(id: string) {
  await db.update(contacts)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(contacts.id, id));
}
