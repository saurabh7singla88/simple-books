import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import * as contactService from '../services/contact.service';

const router = Router();
router.use(authenticate);

const contactSchema = z.object({
  type: z.enum(['CUSTOMER', 'VENDOR', 'BOTH']),
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/', async (req, res) => {
  const all = await contactService.getAllContacts();
  const typeFilter = req.query.type as string | undefined;
  if (typeFilter === 'CUSTOMER') return res.json(all.filter(c => c.type === 'CUSTOMER' || c.type === 'BOTH'));
  if (typeFilter === 'VENDOR') return res.json(all.filter(c => c.type === 'VENDOR' || c.type === 'BOTH'));
  return res.json(all);
});

router.get('/:id', async (req, res) => {
  const contact = await contactService.getContactById(req.params.id);
  if (!contact) { res.status(404).json({ error: 'Contact not found' }); return; }
  res.json(contact);
});

router.post('/', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const result = contactSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }
  const contact = await contactService.createContact(result.data);
  res.status(201).json(contact);
});

router.patch('/:id', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const result = contactSchema.partial().safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }

  const contact = await contactService.getContactById(req.params.id);
  if (!contact) { res.status(404).json({ error: 'Contact not found' }); return; }

  await contactService.updateContact(req.params.id, result.data);
  res.json({ success: true });
});

router.delete('/:id', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const contact = await contactService.getContactById(req.params.id);
  if (!contact) { res.status(404).json({ error: 'Contact not found' }); return; }
  await contactService.deactivateContact(req.params.id);
  res.json({ success: true });
});

export default router;

