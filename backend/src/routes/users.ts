import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import * as userService from '../services/user.service';

const router = Router();
router.use(authenticate);

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'ACCOUNTANT', 'VIEWER']),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'ACCOUNTANT', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

// GET /api/users — Admin only
router.get('/', requireRole('ADMIN'), async (_req, res) => {
  res.json(await userService.getAllUsers());
});

// POST /api/users — Admin only
router.post('/', requireRole('ADMIN'), async (req, res) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  const existing = await userService.getUserByEmail(result.data.email);
  if (existing) { res.status(409).json({ error: 'Email already in use' }); return; }

  const newUser = await userService.createUser(result.data);
  res.status(201).json(newUser);
});

// PATCH /api/users/:id — Admin only
router.patch('/:id', requireRole('ADMIN'), async (req: AuthRequest, res) => {
  const result = updateUserSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  const user = await userService.getUserById(req.params.id);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  if (req.user?.id === req.params.id && result.data.isActive === false) {
    res.status(400).json({ error: 'Cannot deactivate your own account' }); return;
  }

  await userService.updateUser(req.params.id, result.data);
  res.json({ success: true });
});

// DELETE /api/users/:id — Admin only
router.delete('/:id', requireRole('ADMIN'), async (req: AuthRequest, res) => {
  if (req.user?.id === req.params.id) { res.status(400).json({ error: 'Cannot delete your own account' }); return; }

  const user = await userService.getUserById(req.params.id);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  await userService.deleteUser(req.params.id);
  res.json({ success: true });
});

export default router;
