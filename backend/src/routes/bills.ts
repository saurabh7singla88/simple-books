import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import * as billService from '../services/bill.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF and image files are allowed'));
  },
});

const router = Router();
router.use(authenticate);

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  rate: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  accountId: z.string().optional(),
});

const billSchema = z.object({
  contactId: z.string().min(1),
  date: z.string().min(1),
  dueDate: z.string().min(1),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

router.get('/', async (_req, res) => {
  res.json(await billService.getAllBills());
});

router.get('/:id', async (req, res) => {
  const bill = await billService.getBillById(req.params.id);
  if (!bill) { res.status(404).json({ error: 'Bill not found' }); return; }
  res.json(bill);
});

router.post('/:id/attachment', requireRole('ADMIN', 'ACCOUNTANT'), (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) { res.status(400).json({ error: err.message }); return; }
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
    const bill = await billService.getBillRaw(req.params.id);
    if (!bill) { res.status(404).json({ error: 'Bill not found' }); return; }
    if (bill.attachmentPath && fs.existsSync(bill.attachmentPath)) {
      fs.unlinkSync(bill.attachmentPath);
    }
    await billService.saveBillAttachment(req.params.id, req.file.originalname, req.file.path);
    res.json({ attachmentName: req.file.originalname });
  });
});

router.get('/:id/attachment', async (req, res) => {
  const bill = await billService.getBillRaw(req.params.id);
  if (!bill || !bill.attachmentPath || !bill.attachmentName) { res.status(404).json({ error: 'No attachment' }); return; }
  if (!fs.existsSync(bill.attachmentPath)) { res.status(404).json({ error: 'File not found on disk' }); return; }
  res.download(bill.attachmentPath, bill.attachmentName);
});

router.delete('/:id/attachment', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const bill = await billService.getBillRaw(req.params.id);
  if (!bill) { res.status(404).json({ error: 'Bill not found' }); return; }
  if (bill.attachmentPath && fs.existsSync(bill.attachmentPath)) {
    fs.unlinkSync(bill.attachmentPath);
  }
  await billService.clearBillAttachment(req.params.id);
  res.json({ success: true });
});

router.post('/', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const result = billSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }
  const { id, billNumber } = await billService.createBill(result.data);
  res.status(201).json({ id, billNumber });
});

router.patch('/:id', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const bill = await billService.getBillRaw(req.params.id);
  if (!bill) { res.status(404).json({ error: 'Bill not found' }); return; }
  if (bill.status === 'VOID') { res.status(400).json({ error: 'Cannot edit a voided bill' }); return; }
  const result = billSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return; }
  await billService.updateBill(req.params.id, result.data);
  res.json({ success: true });
});

router.patch('/:id/status', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const { status } = req.body;
  if (!['DRAFT', 'RECEIVED', 'PAID', 'VOID'].includes(status)) { res.status(400).json({ error: 'Invalid status' }); return; }
  const bill = await billService.getBillRaw(req.params.id);
  if (!bill) { res.status(404).json({ error: 'Bill not found' }); return; }
  await billService.updateBillStatus(req.params.id, status);
  res.json({ success: true });
});

export default router;