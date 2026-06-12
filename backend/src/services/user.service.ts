import bcrypt from 'bcryptjs';
import { db } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function getAllUsers() {
  return db.select({
    id: users.id, email: users.email, name: users.name,
    role: users.role, isActive: users.isActive, createdAt: users.createdAt,
  }).from(users).all();
}

export async function getUserById(id: string) {
  return db.select().from(users).where(eq(users.id, id)).get() ?? null;
}

export async function getUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email.toLowerCase())).get() ?? null;
}

export async function createUser(data: {
  email: string; name: string; password: string; role: 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
}) {
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(data.password, 12);
  const newUser = {
    id: randomUUID(), email: data.email.toLowerCase(), name: data.name,
    passwordHash, role: data.role, isActive: true, createdAt: now, updatedAt: now,
  };
  await db.insert(users).values(newUser);
  return { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role };
}

export async function updateUser(id: string, data: {
  name?: string; role?: 'ADMIN' | 'ACCOUNTANT' | 'VIEWER'; isActive?: boolean; password?: string;
}) {
  const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.role !== undefined) updates.role = data.role;
  if (data.isActive !== undefined) updates.isActive = data.isActive;
  if (data.password !== undefined) updates.passwordHash = await bcrypt.hash(data.password, 12);
  await db.update(users).set(updates).where(eq(users.id, id));
}

export async function deleteUser(id: string) {
  await db.delete(users).where(eq(users.id, id));
}
