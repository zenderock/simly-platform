-- Migration: Add sim_slot to messages
ALTER TABLE messages ADD COLUMN sim_slot INTEGER;
