-- Add tags to devices (JSON array or simple string? Let's use TEXT[] for postgres array)
ALTER TABLE devices 
    ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Add priority and tags to messages
ALTER TABLE messages 
    ADD COLUMN priority VARCHAR(20) DEFAULT 'normal', -- 'high', 'normal', 'low'
    ADD COLUMN required_tags TEXT[] DEFAULT '{}';   -- If set, message MUST use device with these tags

-- Add index for priority to speed up queue fetching
CREATE INDEX idx_messages_priority_created ON messages(status, priority, created_at);
