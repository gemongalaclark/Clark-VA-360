-- Create contact_messages table
CREATE TABLE contact_messages (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT (submit the contact form)
CREATE POLICY "Allow public inserts"
  ON contact_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only authenticated users (you) can SELECT/read messages
CREATE POLICY "Allow authenticated reads"
  ON contact_messages
  FOR SELECT
  TO authenticated
  USING (true);
