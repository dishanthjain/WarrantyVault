USE warrantyvault;

CREATE TABLE IF NOT EXISTS WarrantyReminders (
  Reminder_ID INT AUTO_INCREMENT PRIMARY KEY,
  W_ID INT NOT NULL,
  User_ID INT NOT NULL,
  ReminderDate DATE NOT NULL,
  ReminderOffset TINYINT UNSIGNED NOT NULL,
  ExpiryDate DATE NOT NULL,
  Title VARCHAR(160) NOT NULL,
  Message VARCHAR(500) NOT NULL,
  IsRead TINYINT(1) NOT NULL DEFAULT 0,
  ReadAt DATETIME NULL,
  EmailStatus ENUM('pending', 'sent', 'failed', 'not_configured', 'skipped')
    NOT NULL DEFAULT 'pending',
  EmailSentAt DATETIME NULL,
  EmailError VARCHAR(500) NULL,
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_reminder_offset CHECK (ReminderOffset IN (0, 7, 30)),
  CONSTRAINT uq_warranty_reminder_date UNIQUE (W_ID, ReminderDate),
  INDEX idx_reminders_user_unread (User_ID, IsRead, CreatedAt),
  CONSTRAINT fk_reminders_warranty
    FOREIGN KEY (W_ID) REFERENCES Warranties(W_ID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reminders_user
    FOREIGN KEY (User_ID) REFERENCES Users(User_ID)
    ON DELETE CASCADE ON UPDATE CASCADE
);
