import { Router } from 'express';
import db from '../db.js';

const router = Router();

const asyncRoute = handler => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

router.post('/', asyncRoute(async (req, res) => {
  const { FileName, MimeType, ImageData, Product_ID, ExtractedText } = req.body || {};

  if (!FileName || !ImageData || typeof ImageData !== 'string') {
    return res.status(400).json({ error: 'A filename and captured image are required.' });
  }

  const match = ImageData.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return res.status(400).json({ error: 'Unsupported image format. Capture a JPEG, PNG, or WebP image.' });
  }

  const mimeType = MimeType || match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 8 * 1024 * 1024) {
    return res.status(413).json({ error: 'The scan is empty or too large. Please retake it with a lower resolution.' });
  }

  const productId = Product_ID ? Number(Product_ID) : null;
  if (productId !== null && (!Number.isInteger(productId) || productId <= 0)) {
    return res.status(400).json({ error: 'Invalid product selection.' });
  }

  const [result] = await db.query(
    `INSERT INTO Documents (Product_ID, FileName, MimeType, FileData, ExtractedText)
     VALUES (?, ?, ?, ?, ?)`,
    [productId, String(FileName).slice(0, 255), mimeType, buffer, String(ExtractedText || '').slice(0, 20000)]
  );

  res.status(201).json({ message: 'Scanned document saved.', Document_ID: result.insertId });
}));

router.get('/', asyncRoute(async (_req, res) => {
  const [rows] = await db.query(
    `SELECT d.Document_ID, d.Product_ID, d.FileName, d.MimeType, d.CreatedAt,
            p.PName, p.Brand
     FROM Documents d
     LEFT JOIN Products p ON p.Product_ID = d.Product_ID
     ORDER BY d.CreatedAt DESC`
  );
  res.json(rows);
}));

router.get('/:id/download', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid document ID.' });

  const [rows] = await db.query(
    'SELECT FileName, MimeType, FileData FROM Documents WHERE Document_ID = ?',
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Document not found.' });

  const file = rows[0];
  const safeName = String(file.FileName).replace(/[\r\n"\\]/g, '_');
  res.setHeader('Content-Type', file.MimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  res.send(file.FileData);
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const [result] = await db.query('DELETE FROM Documents WHERE Document_ID = ?', [Number(req.params.id)]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Document not found.' });
  res.json({ message: 'Document deleted.' });
}));

export default router;
