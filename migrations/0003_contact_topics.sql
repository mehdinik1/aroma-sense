ALTER TABLE contact_messages ADD COLUMN topic TEXT NOT NULL DEFAULT 'other';
ALTER TABLE contact_messages ADD COLUMN order_reference TEXT;
ALTER TABLE contact_messages ADD COLUMN company TEXT;
ALTER TABLE contact_messages ADD COLUMN quantity TEXT;
