-- Migration: Remove sim_slot from messages
ALTER TABLE messages DROP COLUMN sim_slot;
