import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as reportService from '../services/report.service';

const router = Router();
router.use(authenticate);

router.get('/summary', async (_req, res) => {
  res.json(await reportService.getSummary());
});

router.get('/profit-loss', async (req, res) => {
  const from = req.query.from as string;
  const to = req.query.to as string;
  if (!from || !to) { res.status(400).json({ error: 'from and to are required' }); return; }
  res.json(await reportService.getProfitLoss(from, to));
});

router.get('/balance-sheet', async (req, res) => {
  const asOf = req.query.asOf as string;
  if (!asOf) { res.status(400).json({ error: 'asOf is required' }); return; }
  res.json(await reportService.getBalanceSheet(asOf));
});

export default router;