-- Add from_number field to messages table for inbound SMS
ALTER TABLE messages ADD COLUMN IF NOT EXISTS from_number VARCHAR(20);