import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';
import routes from './routes/index.js';
import documentRoutes from './routes/documents.js';
import { startWarrantyReminderScheduler } from './services/warrantyReminders.js';

dotenv.config();

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '12mb' }));

app.get('/', (_req, res) => {
  res.json({ status: 'success', message: 'WarrantyVault API is running' });
});
app.get('/api/health', (_req, res) => {
  res.json({ status: 'success', message: 'WarrantyVault API is working' });
});

app.use('/api', routes);
app.use('/api/documents', documentRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'API route not found', path: req.originalUrl });
});

app.use((err, _req, res, _next) => {
  console.error('API error:', err.message);
  let message = 'Server error. Check the backend terminal.';
  if (err.code === 'ER_NO_SUCH_TABLE') message = 'A database table is missing. Run the required SQL migrations in MySQL.';
  if (err.code === 'ER_NO_SUCH_DB' || err.code === 'ER_BAD_DB_ERROR') message = 'The warrantyvault database does not exist.';
  if (err.code === 'ER_NO_REFERENCED_ROW_2') message = 'The selected product does not exist.';
  res.status(500).json({ error: message });
});

const PORT = Number(process.env.PORT || 5001);

async function startServer() {
  try {
    await db.query('SELECT 1');
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`WarrantyVault API: http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      startWarrantyReminderScheduler();
    });
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    process.exitCode = 1;
  }
}

startServer();
