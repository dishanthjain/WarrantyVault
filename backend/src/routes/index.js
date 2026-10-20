import { Router } from 'express';
import db from '../db.js';
import { runWarrantyReminderCheck } from '../services/warrantyReminders.js';

const router = Router();

const run = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

router.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'WarrantyVault API is working'
  });
});

router.get('/dashboard', run(async (req, res) => {
  const [[products]] = await db.query(
    'SELECT COUNT(*) AS total FROM Products'
  );

  const [[warranties]] = await db.query(`
    SELECT
      COALESCE(SUM(CASE WHEN Status = 'Active'
        AND SDate <= CURDATE() AND EDate >= CURDATE()
        THEN 1 ELSE 0 END), 0) AS active,
      COALESCE(SUM(CASE WHEN EDate < CURDATE()
        OR Status = 'Expired'
        THEN 1 ELSE 0 END), 0) AS expired,
      COALESCE(SUM(CASE WHEN Status = 'Active'
        AND EDate BETWEEN CURDATE()
        AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        THEN 1 ELSE 0 END), 0) AS expiring
    FROM Warranties
  `);

  const [[repairs]] = await db.query(
    'SELECT COUNT(*) AS total FROM Repairs'
  );

  res.json({
    products: Number(products.total),
    active: Number(warranties.active),
    expired: Number(warranties.expired),
    expiring: Number(warranties.expiring),
    repairs: Number(repairs.total)
  });
}));

router.get('/notifications', run(async (req, res) => {
  const requestedLimit = Number(req.query.limit || 20);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 50)
    : 20;

  const [notifications] = await db.query(`
    SELECT r.Reminder_ID, r.W_ID, r.ReminderDate, r.ReminderOffset,
           r.ExpiryDate, r.Title, r.Message, r.IsRead, r.ReadAt, r.CreatedAt,
           p.Product_ID, p.PName, p.Brand, p.Model,
           DATEDIFF(w.EDate, CURDATE()) AS DaysRemaining
    FROM WarrantyReminders r
    JOIN Warranties w ON w.W_ID = r.W_ID
    JOIN Products p ON p.Product_ID = w.Product_ID
    ORDER BY r.CreatedAt DESC, r.Reminder_ID DESC
    LIMIT ?
  `, [limit]);

  const [[unread]] = await db.query(
    'SELECT COUNT(*) AS total FROM WarrantyReminders WHERE IsRead = 0'
  );

  res.json({
    unreadCount: Number(unread.total),
    notifications: notifications.map(notification => ({
      ...notification,
      IsRead: Boolean(notification.IsRead)
    }))
  });
}));

router.patch('/notifications/read-all', run(async (_req, res) => {
  const [result] = await db.query(
    `UPDATE WarrantyReminders
     SET IsRead = 1, ReadAt = COALESCE(ReadAt, NOW())
     WHERE IsRead = 0`
  );

  res.json({ message: 'All notifications marked as read.', updated: result.affectedRows });
}));

router.patch('/notifications/:id/read', run(async (req, res) => {
  const reminderId = Number(req.params.id);
  if (!Number.isInteger(reminderId) || reminderId <= 0) {
    return res.status(400).json({ error: 'Invalid notification ID.' });
  }

  const [result] = await db.query(
    `UPDATE WarrantyReminders
     SET IsRead = 1, ReadAt = COALESCE(ReadAt, NOW())
     WHERE Reminder_ID = ?`,
    [reminderId]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ error: 'Notification not found.' });
  }

  res.json({ message: 'Notification marked as read.' });
}));

router.post('/reminders/run', run(async (_req, res) => {
  const summary = await runWarrantyReminderCheck();
  res.json({ message: 'Warranty reminder check completed.', ...summary });
}));

router.get('/products', run(async (req, res) => {
  const search = `%${String(req.query.search || '').trim()}%`;

  const [rows] = await db.query(`
    SELECT p.*, u.Name AS OwnerName,
      pu.Date AS PurchaseDate, pu.Price, pu.T_No,
      w.W_ID, w.SDate, w.EDate,
      w.Status AS StoredStatus, w.Coverage,
      CASE
        WHEN w.W_ID IS NULL THEN 'No Warranty'
        WHEN w.Status <> 'Active' THEN w.Status
        WHEN w.EDate < CURDATE() THEN 'Expired'
        WHEN w.EDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
          THEN 'Expiring Soon'
        ELSE 'Active'
      END AS WarrantyStatus
    FROM Products p
    JOIN Users u ON u.User_ID = p.User_ID
    LEFT JOIN Purchases pu ON pu.PR_ID = p.Product_ID
    LEFT JOIN Warranties w ON w.Product_ID = p.Product_ID
    WHERE p.PName LIKE ? OR p.Brand LIKE ?
      OR p.Model LIKE ? OR p.SNumber LIKE ?
    ORDER BY p.Product_ID DESC
  `, [search, search, search, search]);

  res.json(rows);
}));

router.post('/products', run(async (req, res) => {
  const {
    PName, Brand, Model, SNumber, PurchaseDate,
    Price, T_No, SDate, EDate, Coverage
  } = req.body;

  if (!PName?.trim() || !Brand?.trim() ||
      !SNumber?.trim() || !PurchaseDate || !SDate || !EDate) {
    return res.status(400).json({
      error: 'Product, purchase and warranty details are required.'
    });
  }

  if (EDate < SDate) {
    return res.status(400).json({
      error: 'Warranty expiry must be on or after its start date.'
    });
  }

  const price = Number(Price || 0);

  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({ error: 'Invalid purchase price.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [users] = await connection.query(
      'SELECT User_ID FROM Users ORDER BY User_ID LIMIT 1'
    );

    let userId = users[0]?.User_ID;

    if (!userId) {
      const [user] = await connection.query(
        'INSERT INTO Users (Name, Email) VALUES (?, ?)',
        ['Demo User', 'demo@warrantyvault.local']
      );
      userId = user.insertId;
    }

    const [product] = await connection.query(
      `INSERT INTO Products
        (User_ID, PName, Brand, Model, SNumber)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, PName.trim(), Brand.trim(),
        Model?.trim() || '', SNumber.trim()]
    );

    const productId = product.insertId;

    await connection.query(
      `INSERT INTO Purchases (PR_ID, T_No, Price, Date)
       VALUES (?, ?, ?, ?)`,
      [productId, T_No?.trim() || '', price, PurchaseDate]
    );

    const today = new Date().toISOString().slice(0, 10);
    const status = EDate < today ? 'Expired' : 'Active';

    await connection.query(
      `INSERT INTO Warranties
        (Product_ID, SDate, EDate, Status, Coverage)
       VALUES (?, ?, ?, ?, ?)`,
      [productId, SDate, EDate, status, Coverage?.trim() || '']
    );

    await connection.commit();

    res.status(201).json({
      message: 'Product registered successfully.',
      Product_ID: productId
    });
  } catch (error) {
    await connection.rollback();

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'This serial number already exists.'
      });
    }

    throw error;
  } finally {
    connection.release();
  }
}));

router.delete('/products/:id', run(async (req, res) => {
  const [result] = await db.query(
    'DELETE FROM Products WHERE Product_ID = ?',
    [Number(req.params.id)]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  res.json({ message: 'Product deleted successfully.' });
}));

router.get('/warranties', run(async (req, res) => {
  const [rows] = await db.query(`
    SELECT w.*, p.PName, p.Brand, p.Model, p.SNumber,
      DATEDIFF(w.EDate, CURDATE()) AS DaysRemaining,
      CASE
        WHEN w.Status <> 'Active' THEN w.Status
        WHEN w.EDate < CURDATE() THEN 'Expired'
        WHEN w.EDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
          THEN 'Expiring Soon'
        ELSE 'Active'
      END AS CurrentStatus
    FROM Warranties w
    JOIN Products p ON p.Product_ID = w.Product_ID
    ORDER BY w.EDate ASC
  `);

  res.json(rows);
}));

router.patch('/warranties/:id', run(async (req, res) => {
  const allowed = ['Active', 'Expired', 'Claimed', 'Voided'];

  if (!allowed.includes(req.body.Status)) {
    return res.status(400).json({ error: 'Invalid warranty status.' });
  }

  const [result] = await db.query(
    'UPDATE Warranties SET Status = ? WHERE W_ID = ?',
    [req.body.Status, Number(req.params.id)]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ error: 'Warranty not found.' });
  }

  res.json({ message: 'Warranty status updated.' });
}));

router.get('/purchases', run(async (req, res) => {
  const [rows] = await db.query(`
    SELECT pu.*, p.PName, p.Brand, p.Model, p.SNumber
    FROM Purchases pu
    JOIN Products p ON p.Product_ID = pu.PR_ID
    ORDER BY pu.Date DESC, pu.P_ID DESC
  `);

  res.json(rows);
}));

router.get('/repairs', run(async (req, res) => {
  const [rows] = await db.query(`
    SELECT r.*, p.PName, p.Brand, p.Model, p.SNumber
    FROM Repairs r
    JOIN Products p ON p.Product_ID = r.Product_ID
    ORDER BY r.Date DESC, r.R_ID DESC
  `);

  res.json(rows);
}));

router.post('/repairs', run(async (req, res) => {
  const {
    Product_ID, Date, Issue, Cost, Service, Status
  } = req.body;

  const allowed = ['Requested', 'In Progress', 'Completed', 'Cancelled'];
  const cost = Number(Cost || 0);
  const status = Status || 'Requested';

  if (!Number.isInteger(Number(Product_ID)) ||
      Number(Product_ID) <= 0 || !Date || !Issue?.trim()) {
    return res.status(400).json({
      error: 'Product, repair date and issue are required.'
    });
  }

  if (!Number.isFinite(cost) || cost < 0) {
    return res.status(400).json({ error: 'Invalid repair cost.' });
  }

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid repair status.' });
  }

  const [result] = await db.query(
    `INSERT INTO Repairs
      (Product_ID, Date, Issue, Cost, Service, Status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [Number(Product_ID), Date, Issue.trim(), cost,
      Service?.trim() || '', status]
  );

  res.status(201).json({
    message: 'Repair record added successfully.',
    R_ID: result.insertId
  });
}));

router.patch('/repairs/:id', run(async (req, res) => {
  const allowed = ['Requested', 'In Progress', 'Completed', 'Cancelled'];

  if (!allowed.includes(req.body.Status)) {
    return res.status(400).json({ error: 'Invalid repair status.' });
  }

  const [result] = await db.query(
    'UPDATE Repairs SET Status = ? WHERE R_ID = ?',
    [req.body.Status, Number(req.params.id)]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ error: 'Repair not found.' });
  }

  res.json({ message: 'Repair status updated successfully.' });
}));

router.delete('/repairs/:id', run(async (req, res) => {
  const [result] = await db.query(
    'DELETE FROM Repairs WHERE R_ID = ?',
    [Number(req.params.id)]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ error: 'Repair not found.' });
  }

  res.json({ message: 'Repair deleted successfully.' });
}));

export default router;
