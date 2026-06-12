import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import * as recurringService from '../services/recurring-expense.service';

const router = Router();
router.use(authenticate);

const recurringSchema = z.object({
  name: z.string().min(1),
  contactId: z.string().optional(),
  accountId: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  nextDate: z.string().min(1),
  notes: z.string().optional(),
});

router.get('/', async (_req, res) => {
  res.json(await recurringService.getAllRecurringExpenses());
});

router.get('/:id', async (req, res) => {
  const row = await recurringService.getRecurringExpenseById(req.params.id);
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(row);
});

router.post('/', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const result = recurringSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }
  const id = await recurringService.createRecurringExpense(result.data);
  res.status(201).json({ id });
});

router.patch('/:id', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const row = await recurringService.getRecurringExpenseById(req.params.id);
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  const result = recurringSchema.partial().safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }
  await recurringService.updateRecurringExpense(req.params.id, result.data);
  res.json({ success: true });
});

router.patch('/:id/toggle', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const isActive = await recurringService.toggleRecurringExpense(req.params.id);
  if (isActive === null) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ isActive });
});

router.post('/:id/generate', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const row = await recurringService.getRecurringExpenseById(req.params.id);
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  if (!row.isActive) { res.status(400).json({ error: 'Recurring expense is inactive' }); return; }
  const result = await recurringService.generateBillFromRecurring(req.params.id);
  if (!result) { res.status(404).json({ error: 'Not found' }); return; }
  res.status(201).json(result);
});

router.delete('/:id', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  await recurringService.deleteRecurringExpense(req.params.id);
  res.json({ success: true });
});

export default router;