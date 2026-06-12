import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import * as journalService from '../services/journal.service';

const router = Router();
router.use(authenticate);

const lineSchema = z.object({
  accountId: z.string().min(1),
  description: z.string().optional(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
});

const journalSchema = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
  reference: z.string().optional(),
  lines: z.array(lineSchema).min(2),
});

router.get('/', async (_req, res) => {
  res.json(await journalService.getAllJournalEntries());
});

router.get('/:id', async (req, res) => {
  const entry = await journalService.getJournalEntryById(req.params.id);
  if (!entry) { res.status(404).json({ error: 'Journal entry not found' }); return; }
  res.json(entry);
});

router.post('/', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const result = journalSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  const { lines } = result.data;
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    res.status(400).json({ error: `Debits (${totalDebit.toFixed(2)}) must equal credits (${totalCredit.toFixed(2)})` }); return;
  }

  const { id, entryNumber } = await journalService.createJournalEntry(result.data);
  res.status(201).json({ id, entryNumber });
});

router.patch('/:id', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const entry = await journalService.getJournalEntryRaw(req.params.id);
  if (!entry) { res.status(404).json({ error: 'Journal entry not found' }); return; }
  if (entry.status === 'POSTED') { res.status(400).json({ error: 'Cannot edit a posted journal entry' }); return; }

  const result = journalSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  const { lines } = result.data;
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    res.status(400).json({ error: `Debits (${totalDebit.toFixed(2)}) must equal credits (${totalCredit.toFixed(2)})` }); return;
  }

  await journalService.updateJournalEntry(req.params.id, result.data);
  res.json({ success: true });
});

router.post('/:id/post', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const entry = await journalService.getJournalEntryRaw(req.params.id);
  if (!entry) { res.status(404).json({ error: 'Journal entry not found' }); return; }
  if (entry.status === 'POSTED') { res.status(400).json({ error: 'Already posted' }); return; }
  await journalService.postJournalEntry(req.params.id);
  res.json({ success: true });
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const entry = await journalService.getJournalEntryRaw(req.params.id);
  if (!entry) { res.status(404).json({ error: 'Journal entry not found' }); return; }
  if (entry.status === 'POSTED') { res.status(400).json({ error: 'Cannot delete a posted entry. Reverse it instead.' }); return; }
  await journalService.deleteJournalEntry(req.params.id);
  res.json({ success: true });
});

export default router;

