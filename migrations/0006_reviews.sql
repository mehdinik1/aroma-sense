CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_handle TEXT NOT NULL,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  moderated_at TEXT,
  UNIQUE (order_id, product_handle)
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_handle, status);

ALTER TABLE orders ADD COLUMN fulfilled_at TEXT;
ALTER TABLE orders ADD COLUMN review_request_sent_at TEXT;
ALTER TABLE orders ADD COLUMN review_request_status TEXT;
