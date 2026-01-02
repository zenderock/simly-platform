-- Remove from_number field from messages table
ALTER TABLE messages DROP COLUMN IF EXISTS from_number;