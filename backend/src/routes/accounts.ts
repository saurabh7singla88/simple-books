import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import * as accountService from '../services/account.service';

const router = Router();
router.use(authenticate);

const accountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

router.get('/', async (_req, res) => {
  res.json(await accountService.getAllAccounts());
});

router.post('/', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const result = accountSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  const existing = await accountService.getAccountByCode(result.data.code);
  if (existing) { res.status(409).json({ error: 'Account code already exists' }); return; }

  const account = await accountService.createAccount(result.data);
  res.status(201).json(account);
});

router.patch('/:id', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const result = accountSchema.partial().safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  const account = await accountService.getAccountById(req.params.id);
  if (!account) { res.status(404).json({ error: 'Account not found' }); return; }

  // If code is being changed, check it doesn't conflict with another account
  if (result.data.code && result.data.code !== account.code) {
    const conflict = await accountService.getAccountByCode(result.data.code);
    if (conflict && conflict.id !== req.params.id) {
      res.status(409).json({ error: 'Account code already exists' }); return;
    }
  }

  await accountService.updateAccount(req.params.id, result.data);
  res.json({ success: true });
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const account = await accountService.getAccountById(req.params.id);
  if (!account) { res.status(404).json({ error: 'Account not found' }); return; }

  await accountService.deactivateAccount(req.params.id);
  res.json({ success: true });
});

export default router;

