ALTER TABLE webhooks ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE webhooks DROP COLUMN secret;
ALTER TABLE webhooks DROP COLUMN organization_id;

ALTER TABLE messages ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE messages DROP COLUMN organization_id;

ALTER TABLE devices ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE devices DROP COLUMN organization_id;

ALTER TABLE users ADD COLUMN api_key VARCHAR(255);
ALTER TABLE users ADD COLUMN plan VARCHAR(50) DEFAULT 'free';
ALTER TABLE users DROP COLUMN avatar_url;
ALTER TABLE users DROP COLUMN name;

DROP TABLE api_keys;
DROP TABLE organization_members;
DROP TABLE organizations;
