import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { runMigrations } from './db/migrate';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import accountRoutes from './routes/accounts';
import contactRoutes from './routes/contacts';
import invoiceRoutes from './routes/invoices';
import billRoutes from './routes/bills';
import journalRoutes from './routes/journals';
import reportRoutes from './routes/reports';
import recurringExpenseRoutes from './routes/recurring-expenses';

const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

// In production, frontend is served from the same origin so CORS isn't needed for the browser.
// If CORS_ORIGIN is explicitly set, honour it; otherwise allow all origins so reverse proxies
// and alternative port mappings (e.g. -p 8080:4000) work without CORS errors.
app.use(cors({
  origin: process.env.CORS_ORIGIN || (isProd ? '*' : 'http://localhost:3002'),
  credentials: process.env.CORS_ORIGIN ? true : false,
}));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recurring-expenses', recurringExpenseRoutes);

// Serve React frontend in production
if (isProd) {
  const publicDir = path.join(__dirname, '../public');
  app.use(express.static(publicDir));
  // SPA fallback — all non-API routes serve index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

runMigrations()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
