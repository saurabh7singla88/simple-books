import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import * as invoiceService from '../services/invoice.service';

const router = Router();
router.use(authenticate);

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  rate: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  accountId: z.string().optional(),
});

const invoiceSchema = z.object({
  contactId: z.string().min(1),
  date: z.string().min(1),
  dueDate: z.string().min(1),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

router.get('/', async (_req, res) => {
  res.json(await invoiceService.getAllInvoices());
});

router.get('/:id', async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.params.id);
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }
  res.json(invoice);
});

router.post('/', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const result = invoiceSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }
  const { id, invoiceNumber } = await invoiceService.createInvoice(result.data);
  res.status(201).json({ id, invoiceNumber });
});

router.patch('/:id', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const invoice = await invoiceService.getInvoiceRaw(req.params.id);
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }
  if (invoice.status === 'VOID') { res.status(400).json({ error: 'Cannot edit a voided invoice' }); return; }

  const result = invoiceSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  await invoiceService.updateInvoice(req.params.id, result.data);
  res.json({ success: true });
});

router.patch('/:id/status', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const { status } = req.body;
  if (!['DRAFT', 'SENT', 'PAID', 'VOID'].includes(status)) { res.status(400).json({ error: 'Invalid status' }); return; }
  const invoice = await invoiceService.getInvoiceRaw(req.params.id);
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }
  await invoiceService.updateInvoiceStatus(req.params.id, status);
  res.json({ success: true });
});

export default router;

