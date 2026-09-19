ALTER TABLE orders ADD COLUMN checkout_url TEXT;
ALTER TABLE orders ADD COLUMN reminder_email TEXT;
ALTER TABLE orders ADD COLUMN reminder_consent_at TEXT;
ALTER TABLE orders ADD COLUMN recovery_status TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_reminders ON orders (status, recovery_status, reminder_email);
