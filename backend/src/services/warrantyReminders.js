import cron from 'node-cron';
import nodemailer from 'nodemailer';
import db from '../db.js';

const REMINDER_DAYS = new Set([30, 7, 0]);
const DEFAULT_CRON_EXPRESSION = '0 8 * * *';
let reminderCheckRunning = false;

const dateString = value => String(value || '').slice(0, 10);

const escapeHtml = value => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT);
  const from = process.env.SMTP_FROM?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASS;

  if (!host || !Number.isInteger(port) || port <= 0 || !from) return null;
  if ((user && !password) || (!user && password)) return null;

  return {
    from,
    transport: {
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      ...(user ? { auth: { user, pass: password } } : {})
    }
  };
}

function buildReminderCopy(warranty) {
  const daysRemaining = Number(warranty.DaysRemaining);
  const expiryDate = dateString(warranty.EDate);
  const productName = warranty.PName || 'Your product';
  const productLabel = [warranty.Brand, warranty.Model].filter(Boolean).join(' ');
  const productDescription = productLabel ? `${productName} (${productLabel})` : productName;

  if (daysRemaining === 0) {
    return {
      title: 'Warranty expires today',
      message: `${productDescription} warranty expires today (${expiryDate}).`
    };
  }

  return {
    title: `Warranty expires in ${daysRemaining} days`,
    message: `${productDescription} warranty expires on ${expiryDate}.`
  };
}

async function setEmailStatus(reminderId, status, errorMessage = null) {
  await db.query(
    `UPDATE WarrantyReminders
     SET EmailStatus = ?, EmailSentAt = CASE WHEN ? = 'sent' THEN NOW() ELSE EmailSentAt END,
         EmailError = ?
     WHERE Reminder_ID = ?`,
    [status, status, errorMessage ? String(errorMessage).slice(0, 500) : null, reminderId]
  );
}

async function sendReminderEmail(reminder) {
  const smtp = getSmtpConfig();
  if (!smtp) {
    await setEmailStatus(reminder.Reminder_ID, 'not_configured');
    return 'not_configured';
  }

  if (!reminder.Email) {
    await setEmailStatus(reminder.Reminder_ID, 'skipped', 'No owner email address is available.');
    return 'skipped';
  }

  const productName = escapeHtml(reminder.PName || 'Your product');
  const expiryDate = escapeHtml(dateString(reminder.EDate));
  const daysRemaining = Number(reminder.DaysRemaining);
  const timing = daysRemaining === 0
    ? 'expires today'
    : `expires in ${daysRemaining} days`;
  const transporter = nodemailer.createTransport(smtp.transport);

  try {
    await transporter.sendMail({
      from: smtp.from,
      to: reminder.Email,
      subject: `WarrantyVault: ${reminder.PName || 'Product'} warranty ${timing}`,
      text: `${reminder.PName || 'Your product'} warranty ${timing}. Expiry date: ${dateString(reminder.EDate)}.`,
      html: `<p>Your <strong>${productName}</strong> warranty ${escapeHtml(timing)}.</p><p>Expiry date: <strong>${expiryDate}</strong></p>`
    });
    await setEmailStatus(reminder.Reminder_ID, 'sent');
    return 'sent';
  } catch (error) {
    await setEmailStatus(reminder.Reminder_ID, 'failed', error.message);
    console.error(`Reminder email failed for warranty ${reminder.W_ID}:`, error.message);
    return 'failed';
  }
}

async function createReminder(warranty) {
  const copy = buildReminderCopy(warranty);
  const smtpConfigured = Boolean(getSmtpConfig());
  const initialEmailStatus = smtpConfigured && warranty.Email
    ? 'pending'
    : smtpConfigured
      ? 'skipped'
      : 'not_configured';

  const [result] = await db.query(
    `INSERT IGNORE INTO WarrantyReminders
      (W_ID, User_ID, ReminderDate, ReminderOffset, ExpiryDate, Title, Message, EmailStatus)
     VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?)`,
    [
      warranty.W_ID,
      warranty.User_ID,
      Number(warranty.DaysRemaining),
      dateString(warranty.EDate),
      copy.title,
      copy.message,
      initialEmailStatus
    ]
  );

  if (!result.affectedRows) return null;

  return {
    ...warranty,
    Reminder_ID: result.insertId,
    Title: copy.title,
    Message: copy.message
  };
}

export async function runWarrantyReminderCheck() {
  if (reminderCheckRunning) return { skipped: true, reason: 'A reminder check is already running.' };

  reminderCheckRunning = true;
  const summary = {
    eligible: 0,
    created: 0,
    duplicates: 0,
    emailsSent: 0,
    emailsFailed: 0,
    emailsSkipped: 0
  };

  try {
    const [warranties] = await db.query(`
      SELECT w.W_ID, w.EDate, p.Product_ID, p.PName, p.Brand, p.Model,
             u.User_ID, u.Email,
             DATEDIFF(w.EDate, CURDATE()) AS DaysRemaining
      FROM Warranties w
      JOIN Products p ON p.Product_ID = w.Product_ID
      JOIN Users u ON u.User_ID = p.User_ID
      WHERE w.Status = 'Active'
        AND w.EDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND DATEDIFF(w.EDate, CURDATE()) IN (0, 7, 30)
      ORDER BY w.EDate ASC, w.W_ID ASC
    `);

    summary.eligible = warranties.length;

    for (const warranty of warranties) {
      const daysRemaining = Number(warranty.DaysRemaining);
      if (!REMINDER_DAYS.has(daysRemaining)) continue;

      const reminder = await createReminder(warranty);
      if (!reminder) {
        summary.duplicates += 1;
        continue;
      }

      summary.created += 1;
      const emailResult = await sendReminderEmail(reminder);
      if (emailResult === 'sent') summary.emailsSent += 1;
      else if (emailResult === 'failed') summary.emailsFailed += 1;
      else summary.emailsSkipped += 1;
    }

    return summary;
  } finally {
    reminderCheckRunning = false;
  }
}

export function startWarrantyReminderScheduler() {
  const expression = process.env.REMINDER_CRON?.trim() || DEFAULT_CRON_EXPRESSION;
  const timezone = process.env.REMINDER_TIMEZONE?.trim() || 'Asia/Kolkata';

  if (!cron.validate(expression)) {
    console.error(`Warranty reminder scheduler was not started: invalid cron expression "${expression}".`);
    return null;
  }

  void runWarrantyReminderCheck()
    .then(summary => console.log('Warranty reminder startup check:', summary))
    .catch(error => console.error('Warranty reminder startup check failed:', error.message));

  const task = cron.schedule(expression, () => {
    void runWarrantyReminderCheck()
      .then(summary => console.log('Warranty reminder daily check:', summary))
      .catch(error => console.error('Warranty reminder daily check failed:', error.message));
  }, { timezone });

  console.log(`Warranty reminders scheduled with "${expression}" (${timezone}).`);
  return task;
}
